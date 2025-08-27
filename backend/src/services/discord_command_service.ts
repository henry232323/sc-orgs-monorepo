import { DiscordService } from './discord_service';
import { DiscordServerModel } from '../models/discord_server_model';
import { OrganizationModel } from '../models/organization_model';
import type {
  APIApplicationCommand,
  APIApplicationCommandOption,
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
} from 'discord-api-types/v10';
import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import logger from '../config/logger';

export class DiscordCommandService {
  private discordService: DiscordService;
  private discordServerModel: DiscordServerModel;
  private organizationModel: OrganizationModel;

  constructor() {
    this.discordService = new DiscordService();
    this.discordServerModel = new DiscordServerModel();
    this.organizationModel = new OrganizationModel();
  }

  /**
   * Register Discord slash commands
   */
  async registerSlashCommands(): Promise<void> {
    try {
      const clientId = process.env.DISCORD_CLIENT_ID;
      if (!clientId) {
        logger.error('DISCORD_CLIENT_ID environment variable is required for slash command registration');
        return;
      }

      const commands: Omit<APIApplicationCommand, 'id' | 'application_id' | 'version'>[] = [
        {
          name: 'scorgs',
          description: 'SC-Orgs Discord integration commands',
          type: ApplicationCommandType.ChatInput,
          default_member_permissions: null,
          options: [
            {
              type: ApplicationCommandOptionType.Subcommand,
              name: 'connect',
              description: 'Connect this Discord server to an SC-Orgs organization or your personal account',
              options: [
                {
                  type: ApplicationCommandOptionType.String,
                  name: 'spectrum_id',
                  description: 'The Spectrum organization ID (e.g., BWINCORP). Leave empty to connect your personal account.',
                  required: false,
                },
              ],
            },
            {
              type: ApplicationCommandOptionType.Subcommand,
              name: 'status',
              description: 'Check the status of SC-Orgs integration for this server',
            },
            {
              type: ApplicationCommandOptionType.Subcommand,
              name: 'disconnect',
              description: 'Disconnect this Discord server from SC-Orgs',
            },
            {
              type: ApplicationCommandOptionType.Subcommand,
              name: 'help',
              description: 'Show help information for SC-Orgs Discord integration',
            },
          ],
        },
      ];

      // Register commands globally
      for (const command of commands) {
        try {
          await this.discordService.registerSlashCommand(command);
          logger.info(`Registered Discord command: ${command.name}`);
        } catch (error) {
          logger.error(`Failed to register command ${command.name}:`, error);
        }
      }

      logger.info('Discord slash commands registered successfully');

    } catch (error) {
      logger.error('Failed to register Discord slash commands:', error);
    }
  }

  /**
   * Handle slash command interactions
   */
  async handleSlashCommand(interaction: APIApplicationCommandInteraction): Promise<void> {
    try {
      logger.debug('Discord slash command received', {
        commandName: interaction.data.name,
        commandType: interaction.data.type,
        guildId: interaction.guild_id,
        channelId: interaction.channel_id,
        userId: interaction.member?.user?.id || interaction.user?.id,
        applicationId: interaction.application_id,
        interactionId: interaction.id,
        token: interaction.token?.substring(0, 10) + '...'
      });
      
      logger.info(`Handling slash command: ${interaction.data.name}`);
      const { data } = interaction;
      const commandName = data.name;

      if (commandName === 'scorgs') {
        logger.debug('Processing scorgs command', {
          options: (data as any).options,
          optionsCount: (data as any).options?.length || 0
        });
        logger.info(`Processing scorgs command with options:`, (data as any).options);
        const subcommand = (data as any).options?.[0];
        if (!subcommand) {
          logger.debug('No subcommand provided, showing help');
          await this.handleHelpCommand(interaction);
          return;
        }

        logger.debug('Executing subcommand', {
          subcommandName: subcommand.name,
          subcommandType: subcommand.type,
          subcommandOptions: subcommand.options
        });

        switch (subcommand.name) {
          case 'connect':
            logger.info(`Executing connect subcommand with options:`, subcommand.options);
            await this.handleConnectCommand(interaction, subcommand);
            break;
          case 'status':
            logger.debug('Executing status subcommand');
            await this.handleStatusCommand(interaction);
            break;
          case 'disconnect':
            logger.debug('Executing disconnect subcommand');
            await this.handleDisconnectCommand(interaction);
            break;
          case 'help':
            await this.handleHelpCommand(interaction);
            break;
          default:
            await this.sendInteractionResponse(interaction, {
              type: InteractionResponseType.ChannelMessageWithSource,
              data: {
                content: '❌ Unknown subcommand. Use `/scorgs help` for available commands.',
                flags: 64, // EPHEMERAL
              },
            });
        }
      } else {
        await this.sendInteractionResponse(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ Unknown command. Use `/scorgs help` for available commands.',
            flags: 64, // EPHEMERAL
          },
        });
      }

    } catch (error) {
      logger.error('Failed to handle slash command:', error);
      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ An error occurred while processing the command',
          flags: 64, // EPHEMERAL
        },
      });
    }
  }

  /**
   * Handle the connect command
   */
  private async handleConnectCommand(interaction: APIApplicationCommandInteraction, subcommand: any): Promise<void> {
    try {
      logger.debug('handleConnectCommand started', {
        guildId: interaction.guild_id,
        userId: interaction.member?.user.id || interaction.user?.id,
        subcommandOptions: subcommand.options,
        subcommandOptionsCount: subcommand.options?.length || 0
      });
      
      logger.info(`handleConnectCommand called with guildId: ${interaction.guild_id}, userId: ${interaction.member?.user.id}`);
      const guildId = interaction.guild_id!;
      const userId = interaction.member!.user.id;
      const spectrumId = subcommand.options?.find((opt: any) => opt.name === 'spectrum_id')?.value;
      
      logger.debug('Extracted parameters', {
        guildId,
        userId,
        spectrumId,
        organizationOption: subcommand.options?.find((opt: any) => opt.name === 'organization'),
        spectrumIdOption: subcommand.options?.find((opt: any) => opt.name === 'spectrum_id'),
        allOptions: subcommand.options
      });
      
      logger.info(`Extracted spectrumId: ${spectrumId}`);

      // Check if user has permission to manage this Discord server
      const userPermissionCheck = await this.discordService.verifyUserPermissions(guildId, userId);
      if (!userPermissionCheck.hasPermission) {
        await this.sendInteractionResponse(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `❌ You don't have permission to manage this Discord server. Required: Manage Server, Administrator, or Server Owner`,
            flags: 64, // EPHEMERAL
          },
        });
        return;
      }

      // Check if server is already registered
      const existingServer = await this.discordServerModel.findByGuildId(guildId);
      if (existingServer) {
        logger.info(`Discord server ${guildId} is already connected to organization ${existingServer.organization_id}, will replace connection`);
        // Delete the existing connection to allow reconnection
        await this.discordServerModel.delete(existingServer.id);
      }

      // Verify bot permissions
      const hasBotPermissions = await this.discordService.verifyBotPermissions(guildId);
      if (!hasBotPermissions) {
        await this.sendInteractionResponse(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ Bot does not have required permissions. Please re-invite the bot with proper permissions.',
            flags: 64, // EPHEMERAL
          },
        });
        return;
      }

      let organization;
      let connectionType;

      if (spectrumId) {
        // Connect to organization
        organization = await this.organizationModel.findByRsiOrgId(spectrumId);
        if (!organization) {
          await this.sendInteractionResponse(interaction, {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: '❌ Organization not found. Please check the Spectrum ID (e.g., BWINCORP).',
              flags: 64, // EPHEMERAL
            },
          });
          return;
        }
        connectionType = 'organization';
      } else {
        // Connect to user's personal account
        // For now, we'll need to find the user's organization or create a personal one
        // This would require additional logic to handle personal accounts
        await this.sendInteractionResponse(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ Personal account connection is not yet implemented. Please specify a Spectrum ID.',
            flags: 64, // EPHEMERAL
          },
        });
        return;
      }

      // Get guild info
      const guildInfo = await this.discordService.getGuildInfo(guildId);

      // Create Discord server record
      logger.info(`Creating Discord server for organization ${organization.rsi_org_id} (${organization.id}) in guild ${guildId}`);
      
      const serverData = {
        organization_id: organization.id,
        discord_guild_id: guildId,
        guild_name: guildInfo.name,
        guild_icon_url: guildInfo.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guildInfo.icon}.png` : undefined,
        bot_permissions: 8590019584,
        auto_create_events: true,
      };

      logger.info(`Discord server data:`, serverData);
      const discordServer = await this.discordServerModel.create(serverData);
      logger.info(`Discord server created successfully:`, { id: discordServer.id, guild_id: discordServer.discord_guild_id });

      const successMessage = connectionType === 'organization' 
        ? `✅ Successfully connected to **${organization.name}**!\n\n🎉 Discord integration is now active. Events created on SC-Orgs will automatically sync to this Discord server.`
        : `✅ Successfully connected to your personal account!\n\n🎉 Discord integration is now active.`;

      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: successMessage,
          // flags: undefined, // Public message (no flags)
        },
      });

      logger.info(`Discord server ${guildId} connected to ${connectionType} ${organization.id} via slash command by user ${userId}`);

    } catch (error) {
      logger.error('Failed to handle connect command:', error);
      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ An error occurred while connecting.',
          flags: 64, // EPHEMERAL
        },
      });
    }
  }

  /**
   * Handle the status command
   */
  private async handleStatusCommand(interaction: APIApplicationCommandInteraction): Promise<void> {
    try {
      const guildId = interaction.guild_id!;

      const discordServer = await this.discordServerModel.findByGuildId(guildId);
      if (!discordServer) {
        await this.sendInteractionResponse(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ This Discord server is not connected to any SC-Orgs organization.\n\nUse `/scorgs connect` to connect to your personal account or `/scorgs connect BWINCORP` to connect to an organization.',
            flags: 64, // EPHEMERAL
          },
        });
        return;
      }

      const organization = await this.organizationModel.findById(discordServer.organization_id);
      const botHealth = await this.discordService.healthCheck();

      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `📊 **SC-Orgs Integration Status**\n\n` +
            `🏢 **Organization:** ${organization?.name || 'Unknown'}\n` +
            `🆔 **Spectrum ID:** ${organization?.rsi_org_id || 'Unknown'}\n` +
            `🤖 **Bot Status:** ${botHealth ? '✅ Healthy' : '❌ Unhealthy'}\n` +
            `🔄 **Auto Events:** ${discordServer.auto_create_events ? '✅ Enabled' : '❌ Disabled'}\n` +
            `📅 **Connected:** ${new Date(discordServer.created_at).toLocaleDateString()}`,
          // flags: undefined, // Public message (no flags)
        },
      });

    } catch (error) {
      logger.error('Failed to handle status command:', error);
      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ An error occurred while checking status.',
          flags: 64, // EPHEMERAL
        },
      });
    }
  }

  /**
   * Handle the disconnect command
   */
  private async handleDisconnectCommand(interaction: APIApplicationCommandInteraction): Promise<void> {
    try {
      const guildId = interaction.guild_id!;
      const userId = interaction.member!.user.id;

      // Verify user has permission
      const userPermissionCheck = await this.discordService.verifyUserPermissions(guildId, userId);
      if (!userPermissionCheck.hasPermission) {
        await this.sendInteractionResponse(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `❌ You don't have permission to manage this Discord server. Required: Manage Server, Administrator, or Server Owner`,
            flags: 64, // EPHEMERAL
          },
        });
        return;
      }

      const discordServer = await this.discordServerModel.findByGuildId(guildId);
      if (!discordServer) {
        await this.sendInteractionResponse(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: '❌ This Discord server is not connected to any SC-Orgs organization.',
            flags: 64, // EPHEMERAL
          },
        });
        return;
      }

      // Delete Discord server record
      await this.discordServerModel.delete(discordServer.id);

      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '✅ Successfully disconnected from SC-Orgs. Discord integration has been disabled.',
          // flags: undefined, // Public message (no flags)
        },
      });

      logger.info(`Discord server ${guildId} disconnected from organization ${discordServer.organization_id} via slash command by user ${userId}`);

    } catch (error) {
      logger.error('Failed to handle disconnect command:', error);
      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ An error occurred while disconnecting.',
          flags: 64, // EPHEMERAL
        },
      });
    }
  }

  /**
   * Handle the help command
   */
  private async handleHelpCommand(interaction: APIApplicationCommandInteraction): Promise<void> {
    try {
      const helpMessage = `🤖 **SC-Orgs Discord Integration Help**

**Available Commands:**
\`/scorgs connect <spectrum_id>\` - Connect this Discord server to an SC-Orgs organization
\`/scorgs connect\` - Connect this Discord server to your personal account
\`/scorgs status\` - Check the integration status for this server
\`/scorgs disconnect\` - Disconnect this server from SC-Orgs
\`/scorgs help\` - Show this help message

**How to Connect:**
1. **For Organization**: Use \`/scorgs connect BWINCORP\` (replace BWINCORP with your Spectrum ID)
2. **For Personal Account**: Use \`/scorgs connect\` (no parameters needed)
3. You must have **Manage Server**, **Administrator**, or be the **Server Owner** permissions

**Requirements:**
- You must have **Manage Server**, **Administrator**, or be the **Server Owner**
- The SC-Orgs bot must be invited with proper permissions
- Your organization must be verified on SC-Orgs

**What Happens After Connection:**
- Events created on SC-Orgs will automatically sync to Discord
- Event updates will sync in real-time
- Event cancellations will remove Discord events

Need more help? Visit the SC-Orgs website or contact support.`;

      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: helpMessage,
          flags: 64, // EPHEMERAL
        },
      });

    } catch (error) {
      logger.error('Failed to handle help command:', error);
      await this.sendInteractionResponse(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ An error occurred while showing help.',
          flags: 64, // EPHEMERAL
        },
      });
    }
  }

  /**
   * Send interaction response
   */
  private async sendInteractionResponse(interaction: APIApplicationCommandInteraction, response: APIInteractionResponse): Promise<void> {
    try {
      await this.discordService.sendInteractionResponse(interaction.id, interaction.token, response);
    } catch (error) {
      logger.error('Failed to send interaction response:', error);
    }
  }
}