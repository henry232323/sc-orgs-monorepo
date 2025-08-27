exports.seed = function (knex) {
  // First, get some organization IDs and user IDs to reference
  return Promise.all([
    knex('organizations').select('id').limit(3),
    knex('users').select('id').limit(3),
  ]).then(([orgs, users]) => {
    const orgIds = orgs.map(org => org.id);
    const userIds = users.map(user => user.id);

    // If no organizations exist, create some sample events without organization_id
    const events = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        organization_id: orgIds[0] || null,
        created_by: userIds[0] || null,
        title: 'Star Citizen Fleet Battle',
        description:
          'Join us for an epic fleet battle in the Stanton system. All skill levels welcome! We will be coordinating with multiple organizations for this massive PvP event.',
        start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        end_time: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
        ), // 3 hours later
        duration_minutes: 180,
        location: 'Stanton System - Port Olisar',
        language: 'English',
        playstyle_tags: JSON.stringify(['Hardcore', 'Military']),
        activity_tags: JSON.stringify(['Combat', 'Fleet Operations']),
        max_participants: 50,
        is_public: true,
        is_active: true,
        registration_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        organization_id: orgIds[1] || null,
        created_by: userIds[1] || null,
        title: 'Trading Expedition',
        description:
          'A peaceful trading expedition to explore profitable routes across multiple systems. Perfect for new players and experienced traders alike.',
        start_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        end_time: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
        ), // 4 hours later
        duration_minutes: 240,
        location: 'Multiple Systems - Starting at Port Tressler',
        language: 'English',
        playstyle_tags: JSON.stringify(['Casual', 'Social']),
        activity_tags: JSON.stringify(['Trading', 'Exploration']),
        max_participants: 20,
        is_public: true,
        is_active: true,
        registration_deadline: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000), // 13 days from now
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        organization_id: orgIds[2] || null,
        created_by: userIds[2] || null,
        title: 'Mining Operation',
        description:
          'Join our mining operation in the Aaron Halo. We will be mining Quantanium and other valuable resources. Mining ships and support vessels welcome.',
        start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        end_time: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000
        ), // 5 hours later
        duration_minutes: 300,
        location: 'Aaron Halo - Asteroid Field',
        language: 'English',
        playstyle_tags: JSON.stringify(['Casual', 'Industrial']),
        activity_tags: JSON.stringify(['Mining', 'Industrial']),
        max_participants: 15,
        is_public: true,
        is_active: true,
        registration_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        organization_id: orgIds[0] || null,
        created_by: userIds[0] || null,
        title: 'Racing Championship',
        description:
          'Annual racing championship featuring the fastest pilots in the verse. Multiple race tracks across different environments.',
        start_time: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        end_time: new Date(
          Date.now() + 21 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000
        ), // 6 hours later
        duration_minutes: 360,
        location: 'Multiple Race Tracks',
        language: 'English',
        playstyle_tags: JSON.stringify(['Competitive', 'Racing']),
        activity_tags: JSON.stringify(['Racing', 'Competition']),
        max_participants: 30,
        is_public: true,
        is_active: true,
        registration_deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        organization_id: orgIds[1] || null,
        created_by: userIds[1] || null,
        title: 'Exploration Mission',
        description:
          'Deep space exploration mission to discover new jump points and unexplored systems. Long-range ships required.',
        start_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        end_time: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000
        ), // 8 hours later
        duration_minutes: 480,
        location: 'Deep Space - Beyond Known Systems',
        language: 'English',
        playstyle_tags: JSON.stringify(['Hardcore', 'Exploration']),
        activity_tags: JSON.stringify(['Exploration', 'Discovery']),
        max_participants: 10,
        is_public: true,
        is_active: true,
        registration_deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        organization_id: orgIds[2] || null,
        created_by: userIds[2] || null,
        title: 'Bounty Hunting Session',
        description:
          'Group bounty hunting session targeting high-value targets. Combat ships and support vessels needed.',
        start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        end_time: new Date(
          Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
        ), // 4 hours later
        duration_minutes: 240,
        location: 'Crusader - Various Locations',
        language: 'English',
        playstyle_tags: JSON.stringify(['Hardcore', 'Combat']),
        activity_tags: JSON.stringify(['Bounty Hunting', 'Combat']),
        max_participants: 25,
        is_public: true,
        is_active: true,
        registration_deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    return knex('events').insert(events);
  });
};
