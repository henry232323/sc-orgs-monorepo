/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('hr_skills').del();
  
  // Inserts seed entries
  await knex('hr_skills').insert([
    // Pilot Skills
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Fighter Pilot',
      category: 'pilot',
      description: 'Skilled in operating single-seat fighter spacecraft',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Transport Pilot',
      category: 'pilot',
      description: 'Experienced in flying cargo and passenger transport vessels',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Capital Ship Pilot',
      category: 'pilot',
      description: 'Qualified to operate large capital ships and cruisers',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Mining Ship Operator',
      category: 'pilot',
      description: 'Specialized in operating mining vessels and equipment',
      verification_required: false,
      created_at: new Date(),
      updated_at: new Date()
    },

    // Engineer Skills
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Ship Systems Engineer',
      category: 'engineer',
      description: 'Expert in spacecraft systems maintenance and repair',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Power Plant Technician',
      category: 'engineer',
      description: 'Specialized in power plant maintenance and optimization',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Quantum Drive Specialist',
      category: 'engineer',
      description: 'Expert in quantum drive systems and jump point navigation',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },

    // Medic Skills
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Combat Medic',
      category: 'medic',
      description: 'Trained in providing medical care in combat situations',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Ship Surgeon',
      category: 'medic',
      description: 'Qualified to perform medical procedures aboard spacecraft',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Emergency Response',
      category: 'medic',
      description: 'First aid and emergency medical response training',
      verification_required: false,
      created_at: new Date(),
      updated_at: new Date()
    },

    // Security Skills
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Boarding Operations',
      category: 'security',
      description: 'Trained in ship boarding and close quarters combat',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Security Officer',
      category: 'security',
      description: 'General security and protection duties',
      verification_required: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Weapons Specialist',
      category: 'security',
      description: 'Expert in various weapon systems and tactics',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },

    // Logistics Skills
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Supply Chain Management',
      category: 'logistics',
      description: 'Managing supply chains and resource distribution',
      verification_required: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Cargo Operations',
      category: 'logistics',
      description: 'Loading, securing, and managing cargo operations',
      verification_required: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Resource Planning',
      category: 'logistics',
      description: 'Strategic planning and allocation of resources',
      verification_required: false,
      created_at: new Date(),
      updated_at: new Date()
    },

    // Leadership Skills
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Squadron Leader',
      category: 'leadership',
      description: 'Leading and coordinating squadron operations',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Fleet Commander',
      category: 'leadership',
      description: 'Strategic command of fleet operations',
      verification_required: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Team Coordinator',
      category: 'leadership',
      description: 'Coordinating team activities and communications',
      verification_required: false,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};