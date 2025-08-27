Next we are going to write a specification for the function of the site itself. This should go in a new file with a similar format. 

We will create an express server which will interface between the frontend and database. We will start by introducing an authentication layer, where we will use passport-discord to allow people to login. We will configure this through an env file

@https://www.passportjs.org/packages/passport-discord/ 

We will set up a knex database that hooks into SQLite, eventually we will choose a different database, but Knex works with multiple so we should make sure it is fairly agnostic to the exact database solution.

We will skip adding unnecessary comments throughout the codebase

With each endpoint we create, we will use this OpenAPI package to act as both validation and provide API documentation for our frontend. We will also create an MCP that allows us to query this OpenAPI spec.

https://www.npmjs.com/package/@wesleytodd/openapi

Once we have the necessary dependencies in order, we will need to create a full directory structure and file structure, with the various routers for the API, clients for the various integrations, etc.

We will also be adding an additional layer to the authentication. This site aims to be a place for players of the game Star Citizen to share information about their in game organizations and player groups. Its primary function is recruitment and allowing people to discover orgs.

We will need to do a few things to enable this
1. Star Citizen account verification. A user may only use the site in a read-only capacity until his account is "RSI Verified". We accomplish this by providing a sentinel code the user must place in their Star Citizen account bio. We fetch this bio and spectrum ID with a tool like these. @https://raw.githubusercontent.com/SC-Market/sc-market-backend/3e337c2440a53e1a0e8c540df24170e15e4b062a/src/clients/rsi/community_hub.ts  @https://raw.githubusercontent.com/SC-Market/sc-market-backend/refs/heads/main/src/clients/spectrum/spectrum.ts This sentinel will look something like [SCORGS:<unique code>] where <unique code> is some generated code connected to the account. If we see the assigned code in the user's account bio, the user is verified and we will store the user's account handle as well as their Spectrum ID in the database, aligning with the above file.

2. We will do a similar process to verify who owns or is able to control these individual orgs. For an org to be displayed on the site, it must be verified as owned by someone. We will put a sentinel in the org's headline and then scrape the page of the org to verify the sentinel is present and that they therefore control the org
@https://robertsspaceindustries.com/en/orgs/SCMARKET 

So, to begin, users will be able to log into the site, verify their ownership of their Star Citizen account by providing a handle to lookup, then they can verify their ownership of an org by providing the org's identifier. We will write a scraper to accomplish this.

At the time of signing in with Discord, if a user does not exist in the database yet, we will create the necessary rows. This user will be unverified until they complete the verification flow.

When an org has been verified it can be considered "registered". Before an org can be displayed on the site, we will need users to provide a banner, a description, and some basic tags to help categorize the language, playstyle, and focuses of the org. The org icon will be scraped from the org page. 

We will additionally allow other users to be invited to help manage the org on the website, along with a granular permission system. Users may be able to create invite codes for the org which users may use to join the org on the site, where they will now have access to help manage it. 

When an org is listed, we will allow comments on the org's post, as well as replies to these comments, upvotes and downvotes on these comments, and upvotes on the org itself. Users will be able to upvote any orgs they like but they will be limited to upvoting only once per week per org.

We will create a comprehensive site search allowing users to search for orgs according to the org's tags, recent activity based on upvotes, total upvotes, and other queries that might be relevant.

We will also create a system for orgs to register events that they are holding. Users may create events for their org, which will include a date and time, duration, and additional details, such as playstyle tags and activity tags, language, and more. We will create a way to fetch events by org, as well as upcoming and past events for a given duration. Events should have a search that includes searching by the relevant tags and details.

All database resources should be timestamped.

Please describe the endpoints that will be necessary for this in the specification document.