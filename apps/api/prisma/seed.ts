import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const funder = await prisma.user.upsert({
    where: { email: 'funder@proofpay.demo' },
    update: {},
    create: { name: 'Demo Funder', email: 'funder@proofpay.demo', role: 'FUNDER' },
  });
  const worker = await prisma.user.upsert({
    where: { email: 'worker@proofpay.demo' },
    update: {},
    create: { name: 'Demo Worker', email: 'worker@proofpay.demo', role: 'WORKER' },
  });
  const examples = [
    {
      title: 'Repair village water pump',
      description: 'Repair the broken water pump and submit genuine before/after evidence.',
      amount: 800,
      currency: 'USD',
      requiredProduct: 'Water pump repair',
      status: 'IN_PROGRESS' as const,
    },
    {
      title: 'Deliver 5L pressure cooker',
      description: 'Deliver one 5L pressure cooker and upload a photo of the actual delivery.',
      amount: 2400,
      currency: 'USD',
      requiredProduct: '5L pressure cooker',
      status: 'IN_PROGRESS' as const,
    },
  ];
  let added = 0;
  for (const example of examples) {
    const exists = await prisma.task.findFirst({
      where: { funderId: funder.id, title: example.title },
      select: { id: true },
    });
    if (!exists) {
      await prisma.task.create({ data: { ...example, funderId: funder.id, workerId: worker.id } });
      added++;
    }
  }
  console.log(`Demo seed completed. ${added} sample task(s) added; existing tasks were preserved.`);
  console.log(`Funder: ${funder.email}`);
  console.log(`Worker: ${worker.email}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
