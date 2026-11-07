extends Node
## 전역 신호 모음. 아래 계층(전투)은 신호만 보내고, 위 계층(규칙, UI)이 받아서 처리한다.

@warning_ignore_start("unused_signal")
signal unit_damaged(target, info, amount)
signal unit_healed(target, amount, source)
signal unit_died(victim, killer)
signal hero_respawned(hero)
signal skill_cast(caster, slot, skill)
## 영웅 처치: 처치한 영웅(없을 수 있음), 도움 영웅 목록
signal hero_killed(victim, killer, assists)
signal hero_level_up(hero, level)
signal reward(hero, xp, gold)
signal boss_warning(boss_name, seconds)
signal boss_spawned(boss)
signal boss_killed(boss, team)
signal item_bought(hero, item)
signal item_sold(hero, item, gold)
signal item_used(hero, item)
signal kill_score_changed(blue_kills, red_kills)
signal match_ended(winner_team, reason)
signal notice(text)
@warning_ignore_restore("unused_signal")
