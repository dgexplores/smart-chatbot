import { User } from '../models/User.js';

export const seedDatabase = async (): Promise<void> => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(`[Seed] Database already has users. Skipping seed.`);
      return;
    }

    console.log(`[Seed] Database is empty. Seeding default users...`);

    // Create Admin
    const admin = new User({
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      role: 'admin',
      isActive: true
    });
    await admin.save();
    console.log(`[Seed] Default Admin created: admin@example.com / AdminPassword123!`);

    // Create Executive
    const executive = new User({
      firstName: 'Sales',
      lastName: 'Executive',
      email: 'executive@example.com',
      password: 'ExecPassword123!',
      role: 'executive',
      isActive: true
    });
    await executive.save();
    console.log(`[Seed] Default Executive created: executive@example.com / ExecPassword123!`);

    console.log(`[Seed] Seeding completed successfully.`);
  } catch (error) {
    console.error(`[Seed] Error seeding database:`, error);
  }
};
