import assert from 'node:assert/strict';
import { CONTRACT_EVENTS } from '../data.js';
import { createState } from '../state.js';
import { deriveTraits, evaluateContractEvent } from '../sim.js';
import { progressDevelopment, processTraineeDrill } from './development.js';

function createAgent(stats) {
  return { stats };
}

function createRngSequence(values) {
  let index = 0;

  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

function eventById(id) {
  const event = CONTRACT_EVENTS.find((entry) => entry.id === id);

  if (!event) {
    throw new Error(`Missing event ${id}`);
  }

  return event;
}

function outcomeRank(outcomeKey) {
  return ['failure', 'compromised', 'success', 'clean'].indexOf(outcomeKey);
}

function approxEqual(actual, expected, epsilon = 0.000001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
}

function run(name, fn) {
  fn();
  console.log(`PASS ${name}`);
}

run('deriveTraits uses the planned formulas', () => {
  const traits = deriveTraits({
    strength: 80,
    agility: 60,
    endurance: 70,
    resilience: 50,
    dexterity: 90,
    intelligence: 75,
    perception: 65,
    discipline: 55,
    instinct: 45,
  });

  approxEqual(traits.grit, (50 + 55 + 70) / 300);
  approxEqual(traits.lethality, ((80 * 0.35) + (90 * 0.35) + (60 * 0.15) + (45 * 0.15)) / 100);
  approxEqual(traits.awareness, ((65 * 0.55) + (45 * 0.25) + (75 * 0.20)) / 100);
  approxEqual(traits.decisionMaking, ((75 * 0.60) + (45 * 0.40)) / 100);
});

run('higher decisionMaking improves surveillance and extraction outcomes', () => {
  const surveillanceEvent = eventById('courier_tail');
  const extractionEvent = eventById('river_extraction');
  const lowDecisionAgent = createAgent({
    strength: 60,
    agility: 60,
    endurance: 60,
    resilience: 60,
    dexterity: 60,
    intelligence: 40,
    perception: 60,
    discipline: 60,
    instinct: 40,
  });
  const highDecisionAgent = createAgent({
    strength: 60,
    agility: 60,
    endurance: 60,
    resilience: 60,
    dexterity: 60,
    intelligence: 82,
    perception: 60,
    discipline: 60,
    instinct: 76,
  });

  const lowSurveillance = evaluateContractEvent(lowDecisionAgent, surveillanceEvent, createRngSequence([0.4]));
  const highSurveillance = evaluateContractEvent(highDecisionAgent, surveillanceEvent, createRngSequence([0.4]));
  const lowExtraction = evaluateContractEvent(lowDecisionAgent, extractionEvent, createRngSequence([0.4]));
  const highExtraction = evaluateContractEvent(highDecisionAgent, extractionEvent, createRngSequence([0.4]));

  assert.ok(highSurveillance.score > lowSurveillance.score);
  assert.ok(highExtraction.score > lowExtraction.score);
  assert.ok(outcomeRank(highSurveillance.outcomeKey) >= outcomeRank(lowSurveillance.outcomeKey));
  assert.ok(outcomeRank(highExtraction.outcomeKey) >= outcomeRank(lowExtraction.outcomeKey));
});

run('low discipline agents run hotter and collapse into worse outcomes on deception jobs', () => {
  const event = eventById('courier_tail');
  const lowDisciplineAgent = createAgent({
    strength: 58,
    agility: 58,
    endurance: 58,
    resilience: 58,
    dexterity: 58,
    intelligence: 60,
    perception: 60,
    discipline: 30,
    instinct: 60,
  });
  const steadyAgent = createAgent({
    strength: 58,
    agility: 58,
    endurance: 58,
    resilience: 58,
    dexterity: 58,
    intelligence: 60,
    perception: 60,
    discipline: 72,
    instinct: 60,
  });

  const lowDiscipline = evaluateContractEvent(lowDisciplineAgent, event, createRngSequence([0.35]));
  const steady = evaluateContractEvent(steadyAgent, event, createRngSequence([0.35]));

  assert.ok(lowDiscipline.heatDelta > steady.heatDelta);
  assert.ok(outcomeRank(lowDiscipline.outcomeKey) <= outcomeRank(steady.outcomeKey));
});

run('high dexterity upgrades stealth combat wins and high strength adds violent heat', () => {
  const event = eventById('mid_tier_enforcer');
  const baselineAgent = createAgent({
    strength: 60,
    agility: 55,
    endurance: 60,
    resilience: 60,
    dexterity: 60,
    intelligence: 55,
    perception: 60,
    discipline: 60,
    instinct: 55,
  });
  const preciseAgent = createAgent({
    strength: 60,
    agility: 55,
    endurance: 60,
    resilience: 60,
    dexterity: 80,
    intelligence: 55,
    perception: 60,
    discipline: 60,
    instinct: 55,
  });
  const strongAgent = createAgent({
    strength: 82,
    agility: 55,
    endurance: 60,
    resilience: 60,
    dexterity: 60,
    intelligence: 55,
    perception: 60,
    discipline: 60,
    instinct: 55,
  });

  const baseline = evaluateContractEvent(baselineAgent, event, createRngSequence([0.8]));
  const precise = evaluateContractEvent(preciseAgent, event, createRngSequence([0.8]));
  const strong = evaluateContractEvent(strongAgent, event, createRngSequence([0.8]));

  assert.equal(baseline.outcomeKey, 'success');
  assert.equal(precise.outcomeKey, 'clean');
  assert.ok(strong.heatDelta > baseline.heatDelta);
});

run('development grows younger agents and advances them into the next stage', () => {
  const state = createState();
  state.worldTick = 12;

  const agent = {
    id: 'child-test',
    name: 'Young Subject',
    rank: 0,
    stage: 'child',
    status: 'alive',
    kills: 0,
    failures: 0,
    contracts: 0,
    heat: 0,
    log: [],
    spawnTick: 0,
    deathTick: null,
    trainingTicks: 3,
    profile: {
      age: 13,
      ageProgress: 11,
      height: 152,
      origin: 'unknown',
      personalitySeed: 0.5,
    },
    stats: {
      strength: 40,
      agility: 42,
      endurance: 43,
      resilience: 41,
      dexterity: 38,
      intelligence: 46,
      perception: 44,
      discipline: 50,
      instinct: 39,
    },
  };

  const beforeEndurance = agent.stats.endurance;
  const result = progressDevelopment(agent, state, createRngSequence([0.5, 0.5, 0.5, 0.5, 0.5]));

  assert.ok(agent.stats.endurance > beforeEndurance);
  assert.equal(agent.profile.age, 14);
  assert.equal(agent.stage, 'trainee');
  assert.equal(result.stageChanged, true);
  assert.ok(state.worldEvents.length > 0);
});

run('trainee drills create controlled setbacks without killing the subject', () => {
  const state = createState();
  state.worldTick = 20;

  const agent = {
    id: 'trainee-test',
    name: 'Trainee Subject',
    rank: 0,
    stage: 'trainee',
    status: 'alive',
    kills: 0,
    failures: 0,
    contracts: 0,
    heat: 0,
    log: [],
    spawnTick: 0,
    deathTick: null,
    trainingTicks: 0,
    profile: {
      age: 16,
      ageProgress: 4,
      height: 168,
      origin: 'unknown',
      personalitySeed: 0.5,
    },
    stats: {
      strength: 40,
      agility: 35,
      endurance: 44,
      resilience: 42,
      dexterity: 36,
      intelligence: 38,
      perception: 37,
      discipline: 30,
      instinct: 28,
    },
  };

  const outcome = processTraineeDrill(agent, state, createRngSequence([0.1, 0.0]));

  assert.equal(outcome, 'failure');
  assert.equal(agent.status, 'alive');
  assert.ok(agent.failures >= 1);
  assert.ok(agent.log.length === 1);
});

console.log('All stat-driven smoke tests passed.');
