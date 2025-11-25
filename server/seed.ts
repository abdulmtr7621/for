import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seed() {
  try {
    const existingOwner = await storage.getUserByUsername('abdul_59260');
    
    if (!existingOwner) {
      const hashedPassword = await bcrypt.hash('owner123', 10);
      const userId = '1288144571494170706';
      
      await storage.createUser({
        username: 'abdul_59260',
        password: hashedPassword,
        userId,
        role: 'owner',
      });
      
      console.log('✅ Default owner user created: abdul_59260 (password: owner123)');
    } else {
      console.log('ℹ️ Owner user already exists');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
