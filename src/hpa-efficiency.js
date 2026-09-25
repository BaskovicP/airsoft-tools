/* Pure HPA tank and measured-consumption calculations shared by the UI and tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HPAAirEfficiency = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PSI_PER_BAR = 14.5037738;
  const ATM_PSI = 14.6959488;
  const LITERS_PER_CUBIC_INCH = .016387064;
  const COMMON_TANKS = Object.freeze([
    Object.freeze({ name: "13 ci / 3000 psi", volumeCi: 13, fillPressurePsi: 3000 }),
    Object.freeze({ name: "48 ci / 3000 psi", volumeCi: 48, fillPressurePsi: 3000 }),
    Object.freeze({ name: "68 ci / 4500 psi", volumeCi: 68, fillPressurePsi: 4500 }),
    Object.freeze({ name: "90 ci / 4500 psi", volumeCi: 90, fillPressurePsi: 4500 })
  ]);

  function finitePositive(value) { return Number.isFinite(value) && value > 0; }
  function ciToLiters(value) { return value * LITERS_PER_CUBIC_INCH; }
  function psiToBar(value) { return value / PSI_PER_BAR; }
  function usableAirLiters(volumeCi, fillPressurePsi, minimumTankPressurePsi, deliveryEfficiency) {
    if (fillPressurePsi <= minimumTankPressurePsi) return 0;
    return ciToLiters(volumeCi) * (fillPressurePsi - minimumTankPressurePsi) / ATM_PSI * deliveryEfficiency;
  }

  function calculate(options = {}) {
    const tankVolumeCi = Number(options.tankVolumeCi ?? 68);
    const fillPressurePsi = Number(options.fillPressurePsi ?? 4500);
    const regulatorPressurePsi = Number(options.regulatorPressurePsi ?? 100);
    const regulatorHeadroomPsi = Number(options.regulatorHeadroomPsi ?? 200);
    const deliveryEfficiencyPct = Number(options.deliveryEfficiencyPct ?? 90);
    const barrelVolumeCm3 = Number(options.barrelVolumeCm3 ?? 10.5);
    const referenceDwellMs = Number(options.referenceDwellMs ?? 1.2);
    const targetDwellMs = Number(options.targetDwellMs ?? 1.2);
    const measuredAirCm3PerShot = Number(options.measuredAirCm3PerShot ?? 300);
    const measurementUncertaintyPct = Number(options.measurementUncertaintyPct ?? 10);
    const values = [tankVolumeCi, fillPressurePsi, regulatorPressurePsi, regulatorHeadroomPsi, deliveryEfficiencyPct, barrelVolumeCm3, referenceDwellMs, targetDwellMs, measuredAirCm3PerShot];
    if (values.some(value => !finitePositive(value)) || deliveryEfficiencyPct > 100 || !Number.isFinite(measurementUncertaintyPct) || measurementUncertaintyPct < 0 || measurementUncertaintyPct >= 100) throw new Error("inputs");

    const deliveryEfficiency = deliveryEfficiencyPct / 100;
    const minimumTankPressurePsi = regulatorPressurePsi + regulatorHeadroomPsi;
    if (fillPressurePsi <= minimumTankPressurePsi) throw new Error("pressure");
    const tankVolumeLiters = ciToLiters(tankVolumeCi);
    const usableStandardAirLiters = usableAirLiters(tankVolumeCi, fillPressurePsi, minimumTankPressurePsi, deliveryEfficiency);
    const idealBarrelAirCm3 = barrelVolumeCm3 * regulatorPressurePsi / ATM_PSI;
    const dwellScale = targetDwellMs / referenceDwellMs;
    const scaledMeasuredAirCm3 = measuredAirCm3PerShot * dwellScale;
    const physicalFloorCm3 = idealBarrelAirCm3 * 1.05;
    const adjustedAirCm3PerShot = Math.max(physicalFloorCm3, scaledMeasuredAirCm3);
    const measurementBelowFloor = scaledMeasuredAirCm3 < physicalFloorCm3;
    const uncertainty = measurementUncertaintyPct / 100;
    const lowConsumption = Math.max(physicalFloorCm3, adjustedAirCm3PerShot * (1 - uncertainty));
    const highConsumption = Math.max(physicalFloorCm3, adjustedAirCm3PerShot * (1 + uncertainty));
    const usableAirCm3 = usableStandardAirLiters * 1000;
    const usableShots = usableAirCm3 / adjustedAirCm3PerShot;
    const shotsLow = usableAirCm3 / highConsumption;
    const shotsHigh = usableAirCm3 / lowConsumption;
    const barrelUtilizationPct = idealBarrelAirCm3 / adjustedAirCm3PerShot * 100;
    const pressureDropPerShotPsi = adjustedAirCm3PerShot / 1000 * ATM_PSI / tankVolumeLiters / deliveryEfficiency;
    const shotsPer1000Psi = 1000 / pressureDropPerShotPsi;
    const excessAirCm3PerShot = Math.max(0, adjustedAirCm3PerShot - idealBarrelAirCm3);

    const tankComparisons = COMMON_TANKS.map(tank => {
      const usableLiters = usableAirLiters(tank.volumeCi, tank.fillPressurePsi, minimumTankPressurePsi, deliveryEfficiency);
      return { ...tank, usableStandardAirLiters: usableLiters, usableShots: usableLiters * 1000 / adjustedAirCm3PerShot };
    });
    const dwellComparisons = [.9, 1, 1.1].map(multiplier => {
      const dwellMs = targetDwellMs * multiplier;
      const consumption = Math.max(physicalFloorCm3, measuredAirCm3PerShot * dwellMs / referenceDwellMs);
      return { multiplier, dwellMs, airCm3PerShot: consumption, usableShots: usableAirCm3 / consumption };
    });

    return {
      inputs: { tankVolumeCi, fillPressurePsi, regulatorPressurePsi, regulatorHeadroomPsi, deliveryEfficiencyPct, barrelVolumeCm3, referenceDwellMs, targetDwellMs, measuredAirCm3PerShot, measurementUncertaintyPct },
      tankVolumeLiters,
      minimumTankPressurePsi,
      usablePressureDropPsi: fillPressurePsi - minimumTankPressurePsi,
      usableStandardAirLiters,
      idealBarrelAirCm3,
      dwellScale,
      scaledMeasuredAirCm3,
      physicalFloorCm3,
      adjustedAirCm3PerShot,
      measurementBelowFloor,
      usableShots,
      shotsLow,
      shotsHigh,
      barrelUtilizationPct,
      excessAirCm3PerShot,
      pressureDropPerShotPsi,
      shotsPer1000Psi,
      tankComparisons,
      dwellComparisons
    };
  }

  return { PSI_PER_BAR, ATM_PSI, LITERS_PER_CUBIC_INCH, COMMON_TANKS, ciToLiters, psiToBar, usableAirLiters, calculate };
});
