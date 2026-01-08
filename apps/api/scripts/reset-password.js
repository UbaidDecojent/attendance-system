const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    const email = 'test@gmail.com';
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
        where: { email },
        data: { passwordHash: hashedPassword }
    });

    console.log(`Password for ${user.email} reset to: ${newPassword}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
