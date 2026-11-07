extends Node
## 전역 신호 모음. 아래 계층(전투)은 신호만 보내고, 위 계층(규칙, UI)이 받아서 처리한다.

@warning_ignore_start("unused_signal")
signal unit_damaged(target, info, amount)
signal unit_healed(target, amount, source)
signal unit_died(victim, killer)
signal hero_respawned(hero)
signal skill_cast(caster, slot, skill)
signal kill_score_changed(blue_kills, red_kills)
signal match_ended(winner_team, reason)
signal notice(text)
@warning_ignore_restore("unused_signal")
