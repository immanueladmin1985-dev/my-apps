// 실행: node dicebound/tests/effects.test.js
// 전투 진행 중에 적용되는 주사위·유물·소모품 효과 (굴리기, 재굴림 제한, 부활, 반사 피해, 소모품)
'use strict';
require('../js/util.js'); require('../js/data.js'); require('../js/rules.js'); require('../js/game.js');
const DB = globalThis.DB, G = DB.game;
G.load();
let fail = 0, pass = 0;
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.log('실패: ' + name); } };

// 바위 주사위는 4~6만 나오고 고를 수 없다
let low = 0;
for (let s = 1; s <= 60; s++) {
  G.newRun('knight', s);
  G.run.dice[1] = { kind: 'heavy' };
  G.startBattle('battle');
  if (G.run.battle.values[1] < 4) low++;
}
ok('바위 주사위는 4~6만 나온다', low === 0);
ok('바위 주사위는 다시 굴릴 주사위로 고를 수 없다', G.toggleDie(1) === false && G.run.battle.selected.length === 0);

// 전투 시작 유물
G.newRun('knight', 5);
G.run.relics = ['star', 'stormmail', 'froststar', 'circle'];
G.startBattle('battle');
const b = G.run.battle;
ok('서리 별: 전투 시작 시 적 빙결 1', b.enemy.status.freeze === 1);
ok('마법진: 첫 턴 재굴림 +2', b.rerollsMax === DB.CONST.rerolls + 2);

// 별의 파편: 한 번 되살아나고, 번개 갑주는 맞은 횟수만큼 반사한다
G.run.hp = 1;
b.enemy.intent = { name: '시험 공격', atk: 30, hits: 2 };
b.enemy.hp = 999; b.enemy.maxHp = 999;
b.values = [1, 2, 3, 5, 6];
G.attack();
ok('별의 파편: 쓰러지면 되살아난다', G.run.hp > 0 && G.run.starUsed === true && G.run.screen === 'battle');
ok('별의 파편: 부활 연출 이벤트', G.events.some(e => e.type === 'revive'));
ok('번개 갑주: 2번 맞으면 적에게 피해 4', G.events.some(e => e.type === 'enemyMove' && e.thorns === 4));
G.run.hp = 1;
G.run.battle.enemy.intent = { name: '시험 공격', atk: 50 };
G.run.battle.values = [1, 2, 3, 5, 6];
G.attack();
ok('별의 파편은 여정마다 한 번만', G.run.screen === 'end');

// 번개 갑주로 적이 쓰러지면 승리
G.newRun('knight', 6);
G.run.relics = ['stormmail'];
G.startBattle('battle');
G.run.battle.values = [1, 2, 3, 5, 6];
G.run.battle.enemy.hp = 50; G.run.battle.enemy.intent = { name: '시험 공격', atk: 1, hits: 1 };
const hit = DB.rules.computeAttack({ dice: G.run.battle.values.map(v => ({ kind: null, value: v })), relics: [], status: {} }).atk;
G.run.battle.enemy.hp = hit + 2;
G.attack();
ok('번개 갑주 반사로 적을 쓰러뜨리면 보상 화면', G.run.screen === 'reward');

// 소모품
G.newRun('mage', 9);
G.startBattle('battle');
G.run.potions = ['blade', 'venom', 'bless'];
const e = G.run.battle.enemy, hp0 = e.hp;
G.usePotion(0); ok('검기 두루마리: 피해 12', hp0 - e.hp === Math.min(12, hp0));
G.usePotion(0); ok('독 플라스크: 출혈 5', e.status.bleed === 5);
const before = G.preview().atk;
G.usePotion(0); ok('축복의 성표: 이번 턴 피해 +10', G.preview().atk === before + 10);
G.attack();
ok('축복의 성표는 공격하면 사라진다', !G.run.battle || G.run.battle.bonusAtk === 0);

// 주사위 강화: 대장간 이벤트 → 고르면 결제·강화, 강화된 바위 주사위는 다시 굴릴 수 있다
G.newRun('knight', 12);
G.run.gold = 100;
G.run.dice[1] = { kind: 'heavy' };
G.run.screen = 'event'; G.run.event = { id: 'forge', done: false, result: null, pickDice: null };
ok('대장간: 강화 선택지를 고를 수 있다', G.eventCan(0) === true);
G.eventChoose(0);
ok('대장간: 강화할 주사위를 고르는 창', !!G.run.pendingUpgrade && G.run.gold === 100);
G.upgradeDie(1);
ok('대장간: 25골드를 내고 강화', G.run.dice[1].up === true && G.run.gold === 75 && G.run.event.done);
G.leave();
G.startBattle('battle');
ok('강화된 바위 주사위는 고를 수 있다', G.toggleDie(1) === true);
ok('강화된 번개 주사위: 4 이상 피해 +4', DB.rules.computeAttack({ dice: [{ kind: 'thunder', value: 4, up: true }].concat([2, 2, 5, 6].map(v => ({ kind: null, value: v }))), relics: [], status: {} }).atk === 12);

// 보스 분노: 체력이 절반 아래로 내려가면 힘이 오르고, 다음 행동부터 분노 행동
G.newRun('knight', 13);
G.run.bossKey = 'necromancer';
G.startBattle('boss');
const boss = G.run.battle.enemy;
boss.hp = Math.floor(boss.maxHp / 2) + 3;
boss.intent = { name: '시험 행동', block: 1 };
G.run.battle.values = [6, 6, 4, 2, 1];
G.attack();
ok('분노: 절반 아래에서 분노한다', boss.raged === true && boss.status.str >= 1);
ok('분노: 연출 이벤트', G.events.some(e => e.type === 'rage'));
ok('분노: 다음 행동은 분노 행동 첫 번째', boss.intent.name === DB.ENEMIES.necromancer.rage.moves[0].name);

// 난이도: 열린 단계까지만 시작할 수 있고, 시작 골드·적 체력이 바뀐다
G.meta.ascMax = 3;
G.newRun('knight', 14, 5);
ok('난이도: 열린 단계(3)까지만', G.run.asc === 3);
ok('난이도 3: 시작 골드 0', G.run.gold === 0);
const def = DB.ENEMIES.barbarian, rng = DB.RNG;
rng.seed(1); const e0 = DB.rules.scaleEnemy('barbarian', def, 3, rng, 0);
rng.seed(1); const e1 = DB.rules.scaleEnemy('barbarian', def, 3, rng, 1);
ok('난이도 1: 정예 체력 +12%', e1.maxHp > e0.maxHp);
G.run.bossKey = 'succubus';
G.startBattle('boss');
G.run.battle.enemy.hp = 1;
G.run.battle.values = [6, 6, 6, 6, 1];
G.attack();
ok('난이도 3 정복: 난이도 4가 열린다', G.meta.ascMax === 4 && G.run.screen === 'end');

console.log(`통과 ${pass}, 실패 ${fail}`);
if (fail) process.exit(1);
