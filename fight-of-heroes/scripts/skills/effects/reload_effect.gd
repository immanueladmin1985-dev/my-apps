class_name ReloadEffect
extends SkillEffect
## 시전자의 탄창을 가득 채운다.


func apply(ctx: SkillContext) -> void:
	if ctx.caster_valid():
		ctx.caster.attack.reload_now()
