import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeTrade() {
  const tradeId = '9b3965b5-efa9-40c4-aa44-97049cf1d26b';

  console.log('🔍 Analizando Trade:', tradeId, '\n');

  try {
    // Obtener trade con todas las relaciones
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        account: true,
        instrument: true,
        strategy: true,
        setup: true,
        fills: {
          orderBy: {
            datetime: 'asc',
          },
        },
      },
    });

    if (!trade) {
      console.log('❌ Trade no encontrado');
      return;
    }

    console.log('📊 Información del Trade:');
    console.log('  - Instrumento:', trade.instrument?.ticker || 'N/A');
    console.log('  - Side:', trade.side);
    console.log('  - Status:', trade.status);
    console.log('  - Planned Entry:', trade.plannedEntry?.toString() || 'N/A');
    console.log('  - Planned Stop Loss:', trade.plannedStopLoss?.toString() || 'N/A');
    console.log('  - Risk Amount:', trade.riskAmount?.toString() || 'N/A');
    console.log('  - Risk Percent:', trade.riskPercent?.toString() || 'N/A');
    console.log('  - Total Fees:', trade.totalFees.toString());
    console.log('  - Net PnL:', trade.netPnL?.toString() || 'N/A');
    console.log('  - Realized PnL:', trade.realizedPnL?.toString() || 'N/A');
    console.log('  - R Multiple:', trade.rMultiple?.toString() || 'N/A');
    console.log('');

    // Analizar fills
    console.log('📈 Fills del Trade:');
    console.log(`  Total de fills: ${trade.fills.length}\n`);

    if (trade.fills.length === 0) {
      console.log('  ⚠️  No hay fills registrados');
      return;
    }

    const entryFills = trade.fills.filter((f) => f.type === 'ENTRY');
    const exitFills = trade.fills.filter((f) => f.type === 'EXIT');
    const feeFills = trade.fills.filter((f) => f.type === 'FEE');
    const adjustmentFills = trade.fills.filter((f) => f.type === 'ADJUSTMENT');

    console.log('  ENTRY Fills:');
    entryFills.forEach((fill, index) => {
      console.log(`    ${index + 1}. Qty: ${fill.quantity?.toString() || 'N/A'}, Price: ${fill.price?.toString() || 'N/A'}, Fee: ${fill.fee.toString()}, Date: ${fill.datetime.toISOString()}`);
    });

    console.log('\n  EXIT Fills:');
    exitFills.forEach((fill, index) => {
      console.log(`    ${index + 1}. Qty: ${fill.quantity?.toString() || 'N/A'}, Price: ${fill.price?.toString() || 'N/A'}, Fee: ${fill.fee.toString()}, Date: ${fill.datetime.toISOString()}`);
    });

    if (feeFills.length > 0) {
      console.log('\n  FEE Fills:');
      feeFills.forEach((fill, index) => {
        console.log(`    ${index + 1}. Fee: ${fill.fee.toString()}, Date: ${fill.datetime.toISOString()}`);
      });
    }

    if (adjustmentFills.length > 0) {
      console.log('\n  ADJUSTMENT Fills:');
      adjustmentFills.forEach((fill, index) => {
        console.log(`    ${index + 1}. Fee: ${fill.fee.toString()}, Date: ${fill.datetime.toISOString()}`);
      });
    }

    // Calcular métricas manualmente
    console.log('\n🧮 Cálculo Manual de Métricas:\n');

    // Calcular openQuantity
    let openQuantity = entryFills.reduce((sum, f) => sum.plus(f.quantity || 0), new (await import('@prisma/client/runtime/library')).Decimal(0));
    openQuantity = exitFills.reduce((sum, f) => sum.minus(f.quantity || 0), openQuantity);
    console.log('  Open Quantity:', openQuantity.toString());

    // Calcular avgEntryPrice
    let totalEntryQty = new (await import('@prisma/client/runtime/library')).Decimal(0);
    let totalEntryValue = new (await import('@prisma/client/runtime/library')).Decimal(0);
    entryFills.forEach((fill) => {
      if (fill.quantity && fill.price) {
        totalEntryQty = totalEntryQty.plus(fill.quantity);
        totalEntryValue = totalEntryValue.plus(fill.quantity.mul(fill.price));
      }
    });
    const avgEntryPrice = totalEntryQty.gt(0) ? totalEntryValue.div(totalEntryQty) : null;
    console.log('  Avg Entry Price:', avgEntryPrice?.toString() || 'N/A');
    console.log('  Total Entry Qty:', totalEntryQty.toString());
    console.log('  Total Entry Value:', totalEntryValue.toString());

    // Calcular avgExitPrice
    let totalExitQty = new (await import('@prisma/client/runtime/library')).Decimal(0);
    let totalExitValue = new (await import('@prisma/client/runtime/library')).Decimal(0);
    exitFills.forEach((fill) => {
      if (fill.quantity && fill.price) {
        totalExitQty = totalExitQty.plus(fill.quantity);
        totalExitValue = totalExitValue.plus(fill.quantity.mul(fill.price));
      }
    });
    const avgExitPrice = totalExitQty.gt(0) ? totalExitValue.div(totalExitQty) : null;
    console.log('  Avg Exit Price:', avgExitPrice?.toString() || 'N/A');
    console.log('  Total Exit Qty:', totalExitQty.toString());
    console.log('  Total Exit Value:', totalExitValue.toString());

    // Calcular realizedPnL
    let realizedPnL = new (await import('@prisma/client/runtime/library')).Decimal(0);
    exitFills.forEach((fill) => {
      if (fill.quantity && fill.price && avgEntryPrice) {
        const pnl = fill.quantity.mul(fill.price.minus(avgEntryPrice));
        realizedPnL = realizedPnL.plus(pnl);
        console.log(`    Fill EXIT: Qty ${fill.quantity.toString()}, Price ${fill.price.toString()}, PnL: ${pnl.toString()}`);
      }
    });
    console.log('\n  Realized PnL (sin fees):', realizedPnL.toString());

    // Total fees
    const totalFees = trade.fills.reduce((sum, f) => sum.plus(f.fee), new (await import('@prisma/client/runtime/library')).Decimal(0));
    console.log('  Total Fees:', totalFees.toString());

    // Net PnL
    const netPnL = realizedPnL.minus(totalFees);
    console.log('  Net PnL (Realized - Fees):', netPnL.toString());

    // R Multiple
    if (trade.riskAmount) {
      const rMultiple = netPnL.div(trade.riskAmount);
      console.log('  R Multiple (Net PnL / Risk):', rMultiple.toString());
    }

    console.log('\n📋 Comparación con valores en BD:');
    console.log('  BD - Realized PnL:', trade.realizedPnL?.toString() || 'N/A');
    console.log('  BD - Net PnL:', trade.netPnL?.toString() || 'N/A');
    console.log('  BD - R Multiple:', trade.rMultiple?.toString() || 'N/A');

    // Análisis del problema
    console.log('\n🔍 Análisis:');
    if (trade.side === 'LONG') {
      console.log('  Trade LONG: PnL = (Exit Price - Entry Price) * Quantity');
    } else {
      console.log('  Trade SHORT: PnL = (Entry Price - Exit Price) * Quantity');
    }

    if (avgEntryPrice && avgExitPrice) {
      const priceDiff = avgExitPrice.minus(avgEntryPrice);
      console.log(`  Diferencia de precio: ${priceDiff.toString()}`);
      if (trade.side === 'LONG') {
        console.log(`  PnL esperado (LONG): ${priceDiff.mul(totalExitQty).toString()}`);
      } else {
        console.log(`  PnL esperado (SHORT): ${priceDiff.neg().mul(totalExitQty).toString()}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTrade();

