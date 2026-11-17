# 그림 에셋 요청 프롬프트 (GPT 이미지 생성용)

게임에 바로 넣을 수 있도록 크기, 시점, 배경, 파일 이름을 맞춘 프롬프트입니다. 프롬프트 본문은 이미지 모델이 더 정확하게 따르도록 영어로 썼습니다.

## 진행 방법

1. **한 장에 하나씩** 만드는 편이 좋습니다. 여러 개를 한 장에 모으면 크기와 간격이 제각각이라 잘라 쓰기 어렵습니다.
2. **처음 만든 영웅 한 장이 마음에 들면**, 그 그림을 첨부하고 "이 그림과 같은 화풍, 같은 시점, 같은 크기 비율로"라고 덧붙여서 나머지를 만듭니다. 화풍을 맞추는 데 가장 효과가 큽니다. 아이템과 맵도 같은 방식으로 첫 장을 기준으로 삼습니다.
3. **배경:** 투명 PNG로 받습니다. 투명이 안 되면(회색·흰색 체크무늬가 그림에 그려져 나오는 경우) 배경을 **단색 마젠타(#FF00FF)** 로 다시 요청해 주세요. 그 색은 제가 지울 수 있습니다.
4. **파일 이름:** 아래 표의 `파일 이름`대로 저장해서 폴더째(또는 zip으로) 채팅에 올려 주시면, 크기를 줄이고 게임에 연결하겠습니다. 이름이 틀려도 어떤 그림인지 알 수 있으면 괜찮습니다.
5. 팀 색(블루/레드)은 게임이 캐릭터 발밑 고리로 표시하므로, 캐릭터 그림에는 팀 색을 넣지 않습니다.

---

## 1. 영웅 스프라이트 (10장 + 변신 1장)

### 공통 앞부분 (모든 영웅 프롬프트 앞에 붙임)

```
Original character design for a 2D mobile top-down action game (not based on any existing game or franchise).
Single character, full body, chibi proportions (about 2.5 heads tall), cute but heroic.
Camera: top-down 3/4 view (seen from above at about 45 degrees), character turned slightly toward the lower right.
Idle battle stance, weapon clearly visible, readable silhouette at small size.
Clean hand-painted cel-shading, bold dark outline, bright saturated colors, soft lighting from the upper left.
Centered in the canvas, feet near the bottom with a small margin, character fills about 75% of the height.
Transparent background, no ground shadow, no text, no border, no extra characters or objects.
Square 1024x1024 PNG.
```

### 영웅별 뒷부분

| 파일 이름 | 영웅 | 프롬프트 뒷부분 |
|---|---|---|
| `blade_master.png` | 검성 | `Character: "Blade Master", a young swordsman. Light leather and cloth armor with warm gold-tan accents (#F2C773), flowing scarf, one long single-edged sword held ready. Confident, agile look.` |
| `assassin.png` | 암살자 | `Character: "Assassin", a hooded rogue in dark purple (#8C66B3) and black, face half-covered by a mask, two curved daggers held in reverse grip, light crouching stance.` |
| `dragon_knight.png` | 용기사 | `Character: "Dragon Knight", a sturdy knight in crimson-red armor (#CC5A4D) with a dragon-shaped helmet and small wing-like pauldrons, holding a long spear.` |
| `dragon_knight_dragon.png` | 용기사(변신) | `Character: the Dragon Knight transformed into a small bipedal red dragon (#CC5A4D) with spread wings and glowing ember chest, same chibi proportions, slightly bigger than a normal hero.` |
| `elf_archer.png` | 엘프 궁수 | `Character: "Elf Archer", a slender elf with pointed ears in leaf-green clothing (#8CD980), short hooded cloak, holding a tall wooden longbow, quiver of arrows on the back.` |
| `fire_mage.png` | 화염술사 | `Character: "Fire Mage", a mage in orange-red robes (#FF7340) with flame patterns, holding a staff topped with a burning orb, small fire sparks around the hand.` |
| `frost_mage.png` | 빙결술사 | `Character: "Frost Mage", a calm mage in icy light-blue and white robes (#8CCCFF), holding a crystal staff with an ice shard tip, faint frost mist.` |
| `monk.png` | 무투가 | `Character: "Monk", a martial artist in orange and brown training clothes (#F2994D), bandaged fists raised in a fighting stance, bare arms, headband.` |
| `paladin.png` | 성기사 | `Character: "Paladin", a holy knight in cream and gold plate armor (#E6D98C), large round shield with a sun emblem, short mace, small glowing aura.` |
| `saint.png` | 성녀 | `Character: "Saint", a gentle priestess in white and pale gold robes (#FFF2BF), holding a staff with a halo-shaped top, soft holy light around her.` |
| `summoner.png` | 소환술사 | `Character: "Summoner", a necromancer in violet and dark robes (#9973D9), holding an open glowing spell book, small skull ornaments, wisps of purple soul flame.` |

---

## 2. 몬스터 스프라이트 (9장, 맵에 함께 필요)

영웅 공통 앞부분에서 첫 줄의 `Single character, full body, chibi proportions...` 대신 아래 줄을 쓰고, 나머지는 그대로 둡니다.

```
Single fantasy monster, full body, chunky stylized proportions matching the hero chibi style.
```

| 파일 이름 | 몬스터 | 프롬프트 뒷부분 |
|---|---|---|
| `goblin.png` | 떠돌이 고블린 | `Monster: a small green goblin with a rusty short knife and a ragged sack.` |
| `wolf.png` | 늑대 | `Monster: a gray wolf, four-legged, snarling, walking toward the lower right.` |
| `wolf_alpha.png` | 우두머리 늑대 | `Monster: a larger dark wolf with a white mane and scars, slightly glowing yellow eyes.` |
| `skeleton.png` | 해골 전사 | `Monster: a skeleton warrior with a chipped sword and a broken round shield.` |
| `bone_golem.png` | 뼈 골렘 | `Monster: a hulking golem made of stacked bones with a skull head, purple glow in the eye sockets.` |
| `stone_golem.png` | 바위 골렘 | `Monster: a heavy rock golem with mossy stone body and glowing cracks, big fists.` |
| `forest_guardian.png` | 숲의 수호정령 (보스) | `Boss monster: a large forest spirit made of wood, vines and leaves, antler-like branches, glowing green core. Fills the canvas more (about 90% of the height).` |
| `lava_giant.png` | 용암 거인 (보스) | `Boss monster: a large giant of black volcanic rock with flowing orange lava veins and a burning head. Fills the canvas more (about 90% of the height).` |
| `ancient_dragon.png` | 고대 흑룡 (최종 보스) | `Final boss: a huge ancient black dragon with spread wings, purple-black scales and glowing violet eyes, seen from above at 3/4 angle. Fills the canvas (about 95%).` |

---

## 3. 아이템 아이콘 (39장)

### 공통 앞부분

```
Original fantasy RPG inventory item icon (not copied from any existing game).
Single object, centered, slight 3/4 angle, fills about 80% of the canvas.
Hand-painted style, bold dark outline, bright saturated colors, soft highlight from the upper left, readable at 64x64 pixels.
Transparent background, no frame, no text, no hands, no extra objects.
Square 1024x1024 PNG.
```

### 아이콘별 뒷부분 (`Item: ...` 만 바꿔 붙임)

| 파일 이름 | 아이템 | 뒷부분 |
|---|---|---|
| `dagger.png` | 낡은 단검 | `Item: an old worn dagger with a leather-wrapped grip.` |
| `keen_dirk.png` | 예리한 단도 | `Item: a sharp slender dirk with a gleaming edge.` |
| `steel_sword.png` | 강철 장검 | `Item: a polished steel longsword.` |
| `hero_sword.png` | 영웅의 검 | `Item: a heroic golden-hilted sword with a blue gem, faint glow.` |
| `blood_blade.png` | 피의 대검 | `Item: a huge greatsword with a dark red blade and blood-red runes.` |
| `armor_breaker.png` | 갑옷 파괴자 | `Item: a heavy war hammer with spikes, designed to crush armor.` |
| `conqueror_axe.png` | 정복자의 도끼 | `Item: a large ornate battle axe with gold trim.` |
| `vampire_fang.png` | 흡혈귀의 이빨 | `Item: a curved fang-shaped blade, dark crimson, dripping red glow.` |
| `quick_gloves.png` | 날렵한 장갑 | `Item: a pair of light leather gloves with wind swirl marks.` |
| `storm_bow.png` | 질풍의 활 | `Item: an elegant bow crackling with wind and small lightning.` |
| `orb.png` | 마법 구슬 | `Item: a glowing blue magic orb on a small stand.` |
| `power_staff.png` | 마력의 지팡이 | `Item: a tall magic staff with a large purple crystal.` |
| `archmage_crown.png` | 대마법사의 관 | `Item: an ornate silver crown with floating arcane gems.` |
| `chrono_scepter.png` | 시간술사의 홀 | `Item: a golden scepter topped with a small hourglass and clock gears.` |
| `leather_armor.png` | 가죽 갑옷 | `Item: a simple brown leather chest armor.` |
| `chain_mail.png` | 사슬 갑옷 | `Item: a steel chain mail shirt.` |
| `guardian_plate.png` | 수호자의 갑옷 | `Item: heavy silver plate armor with a shield emblem.` |
| `dragon_shield.png` | 용비늘 방패 | `Item: a shield made of red dragon scales.` |
| `magic_cloak.png` | 마법 망토 | `Item: a folded blue cloak with silver arcane embroidery.` |
| `spirit_cloak.png` | 정령의 망토 | `Item: a translucent teal cloak with floating spirit lights.` |
| `spirit_king_robe.png` | 정령왕의 외투 | `Item: a majestic long coat in teal and gold with glowing spirit patterns.` |
| `old_boots.png` | 낡은 장화 | `Item: a pair of worn brown boots.` |
| `swift_boots.png` | 신속의 장화 | `Item: a pair of light boots with small wings at the ankles.` |
| `berserker_boots.png` | 광전사의 장화 | `Item: a pair of red spiked boots.` |
| `mage_boots.png` | 마법사의 장화 | `Item: a pair of purple cloth boots with glowing runes.` |
| `plated_boots.png` | 판금 장화 | `Item: a pair of heavy steel plated boots.` |
| `giant_belt.png` | 거인의 허리띠 | `Item: a thick leather belt with a large iron buckle.` |
| `immortal_amulet.png` | 불멸의 목걸이 | `Item: a golden amulet with a glowing phoenix feather emblem.` |
| `life_gem.png` | 생명의 보석 | `Item: a red heart-shaped gemstone glowing softly.` |
| `mana_crystal.png` | 마나 결정 | `Item: a cluster of blue mana crystals.` |
| `regen_pendant.png` | 재생의 목걸이 | `Item: a green leaf-shaped pendant on a cord.` |
| `lucky_coin.png` | 행운의 동전 | `Item: a shiny gold coin with a four-leaf clover stamp.` |
| `time_ring.png` | 시간의 반지 | `Item: a silver ring with a tiny clock face gem.` |
| `wisdom_ring.png` | 지혜의 반지 | `Item: a gold ring with a deep blue sapphire.` |
| `health_potion.png` | 체력 물약 | `Item: a round glass potion bottle with bright red liquid and a cork.` |
| `mana_potion.png` | 마나 물약 | `Item: a round glass potion bottle with bright blue liquid and a cork.` |
| `iron_elixir.png` | 강철의 비약 | `Item: a tall flask with silver metallic liquid and an iron cap.` |
| `rage_elixir.png` | 분노의 비약 | `Item: a tall flask with bubbling orange-red liquid and a skull-shaped stopper.` |
| `recall_scroll.png` | 귀환 두루마리 | `Item: a rolled parchment scroll tied with a blue ribbon, glowing portal rune.` |

---

## 4. 맵 에셋

맵은 4200×2600 크기의 위에서 내려다보는 전장입니다. 바닥 무늬는 반복해서 깔고, 건물과 장식은 그 위에 올립니다.

### 4-1. 반복 바닥 무늬 (이음새 없이 이어져야 함)

공통 앞부분:

```
Seamless tileable texture for a 2D top-down mobile game map, viewed straight from above (orthographic, no perspective).
Hand-painted stylized look matching bright cel-shaded characters, low contrast so characters stand out on top.
The left/right and top/bottom edges must tile seamlessly. No objects that obviously repeat, no text, no border.
Square 1024x1024 PNG, fully opaque.
```

| 파일 이름 | 쓰는 곳 | 뒷부분 |
|---|---|---|
| `ground_grass.png` | 맵 전체 바닥 | `Texture: soft green meadow grass with tiny flowers and subtle variation.` |
| `ground_dirt.png` | 길, 기지 주변 | `Texture: packed light-brown dirt path with small pebbles.` |
| `ground_stone.png` | 중앙 무대 | `Texture: old gray stone floor tiles, slightly worn, mossy gaps.` |
| `ground_dungeon.png` | 던전 캠프 바닥 | `Texture: dark cave floor with cracked stone and faint purple moss.` |
| `ground_lava.png` | 용암 거인 구역 | `Texture: dark volcanic rock with thin glowing orange lava cracks.` |
| `ground_forest.png` | 숲의 수호정령 구역 | `Texture: deep forest floor with fallen leaves, roots and moss.` |
| `wall_rock.png` | 벽, 장애물 | `Texture: top view of rough rocky cliff tops, gray-brown stones, slightly darker than the ground.` |

### 4-2. 건물·장식 (투명 배경, 위에서 내려다본 모습)

공통 앞부분:

```
Single map object for a 2D top-down mobile game, viewed from above at a slight angle (top-down 3/4), matching bright hand-painted cel-shaded style.
Centered, transparent background, soft shadow allowed only directly under the object, no text, no border, no characters.
Square 1024x1024 PNG.
```

| 파일 이름 | 쓰는 곳 | 뒷부분 |
|---|---|---|
| `base_fountain.png` | 양 팀 기지(우물) | `Object: a circular stone plaza with a magical healing fountain in the center, glowing white crystal, steps around the edge. Neutral colors (team color is added by the game).` |
| `shop.png` | 상점 | `Object: a small merchant tent with a striped canopy, crates, potion bottles and a weapon rack.` |
| `center_stage.png` | 중앙 미니언 소환 무대 | `Object: a circular ancient stone arena platform with rune circle carvings and four short pillars.` |
| `camp_ring.png` | 던전 캠프 자리 | `Object: a circular ring of broken stones and small torches marking a monster lair, empty center.` |
| `boss_altar.png` | 보스 자리 | `Object: a large circular ritual altar with glowing purple runes and broken pillars, empty center.` |
| `tree_1.png`, `tree_2.png` | 장식 | `Object: a round stylized tree seen from above, lush green canopy.` (두 번째는 `slightly different shape and lighter green`) |
| `bush.png` | 장식 | `Object: a small round green bush.` |
| `rock_1.png`, `rock_2.png` | 장식 | `Object: a cluster of gray rocks with moss.` (두 번째는 `a single large boulder`) |
| `crystal.png` | 장식 | `Object: a cluster of glowing blue crystals growing from the ground.` |
| `torch.png` | 장식 | `Object: a standing torch with a bright flame.` |

---


## 5. 스킬 아이콘 (영웅마다 한 장, 50개)

영웅 한 명당 그림 한 장에 6칸(가로 3 × 세로 2)으로 만듭니다. 칸 순서는 **윗줄 Q·W·E, 아랫줄 R·패시브·빈칸** 입니다.
파일 이름을 `<영웅 id>_skills.png` (예: `blade_master_skills.png`) 또는 `<영웅 이름> 스킬.png` (예: `검성 스킬.png`) 로 저장하면 정리 도구가 칸별로 잘라 넣습니다.

### 공통 앞부분

```
Original fantasy game skill icon sheet (not copied from any existing game).
A 3x2 grid of six square skill icons on a flat magenta (#FF00FF) background, with a clear magenta gap between icons.
Top row: icons 1, 2, 3. Bottom row: icons 4, 5, and an empty magenta cell.
Each icon is a rounded-square tile with its own painted dark background and a bold symbol in the center, readable at 64x64 pixels.
Bright hand-painted style matching cel-shaded chibi heroes, bold outline, glowing effects. No text, no numbers, no letters.
Square 1536x1024 PNG.
```

### 영웅별 뒷부분

| 파일 이름 | 영웅 | 뒷부분 |
|---|---|---|
| `assassin_skills.png` | 암살자 | `Theme color: matches the hero "암살자". 1 (Q, 그림자 찌르기): a shadowy figure stabbing from behind with a purple dagger. 2 (W, 독칼 던지기): a green poison-dripping throwing knife in flight. 3 (E, 그림자 숨기): a fading purple silhouette dissolving into smoke. 4 (R, ultimate, 처형): a crimson dagger slash with a skull, execution strike, more dramatic and golden-framed. 5 (passive, 급소): a glowing red weak point target mark on armor, with a subtle circular frame.` |
| `blade_master_skills.png` | 검성 | `Theme color: matches the hero "검성". 1 (Q, 돌진 베기): a golden blade dashing forward leaving a speed trail. 2 (W, 회전베기): a spinning sword whirlwind circle. 3 (E, 검기 방어): a translucent golden sword-energy shield. 4 (R, ultimate, 일섬): a single blinding white-gold flash slash across the icon, more dramatic and golden-framed. 5 (passive, 검의 길): three crossed sword strikes with a golden glow, with a subtle circular frame.` |
| `dragon_knight_skills.png` | 용기사 | `Theme color: matches the hero "용기사". 1 (Q, 창 찌르기): a long red spear thrusting forward. 2 (W, 화염 숨결): a dragon head breathing a wide cone of fire. 3 (E, 용비늘): overlapping red dragon scales forming a shield. 4 (R, ultimate, 용 변신): a red knight transforming into a fiery dragon silhouette, more dramatic and golden-framed. 5 (passive, 용의 피): a drop of glowing dragon blood with flames, with a subtle circular frame.` |
| `elf_archer_skills.png` | 엘프 궁수 | `Theme color: matches the hero "엘프 궁수". 1 (Q, 관통 화살): a green arrow piercing through several targets in a line. 2 (W, 가시 덫): a hidden thorn trap with vines and spikes. 3 (E, 후퇴 도약): an elf leaping backward with wind swirls. 4 (R, ultimate, 화살비): a rain of arrows falling from the sky onto the ground, more dramatic and golden-framed. 5 (passive, 바람의 가호): a swirl of green wind feathers, with a subtle circular frame.` |
| `fire_mage_skills.png` | 화염술사 | `Theme color: matches the hero "화염술사". 1 (Q, 화염구): a blazing fireball. 2 (W, 불기둥): a pillar of fire erupting from the ground. 3 (E, 화염 도약): a burst of flame teleport with fire sparks. 4 (R, ultimate, 메테오): a huge meteor falling with a fiery tail, more dramatic and golden-framed. 5 (passive, 점화): a small ember igniting into flame, with a subtle circular frame.` |
| `frost_mage_skills.png` | 빙결술사 | `Theme color: matches the hero "빙결술사". 1 (Q, 얼음 창): a sharp ice spear flying forward. 2 (W, 서리 지대): a frozen ground area with frost crystals. 3 (E, 얼음 갑옷): a body covered in icy crystal armor. 4 (R, ultimate, 절대 영도): a giant blue snowflake freezing everything, absolute zero, more dramatic and golden-framed. 5 (passive, 냉기): a cold blue frost breath swirl, with a subtle circular frame.` |
| `monk_skills.png` | 무투가 | `Theme color: matches the hero "무투가". 1 (Q, 붕권): a powerful straight punch with an impact shockwave. 2 (W, 연환격): a flurry of many fists striking. 3 (E, 철벽 자세): a calm fighting stance with an iron wall aura. 4 (R, ultimate, 천붕권): a falling sky punch with a huge ground shockwave, more dramatic and golden-framed. 5 (passive, 연타): rapid triple jab motion lines, with a subtle circular frame.` |
| `paladin_skills.png` | 성기사 | `Theme color: matches the hero "성기사". 1 (Q, 심판의 망치): a glowing holy hammer striking down. 2 (W, 신성한 방패): a golden holy shield with a sun emblem. 3 (E, 돌격): a shield charge rushing forward. 4 (R, ultimate, 신의 가호): golden wings of divine protection over allies, more dramatic and golden-framed. 5 (passive, 수호의 맹세): a golden aura ring with a sun symbol, with a subtle circular frame.` |
| `saint_skills.png` | 성녀 | `Theme color: matches the hero "성녀". 1 (Q, 빛의 화살): a small arrow made of white holy light. 2 (W, 치유): a green-gold healing cross with sparkles. 3 (E, 정화의 빛): a gentle purifying white light wave. 4 (R, ultimate, 부활의 기도): praying hands with a bright halo and rising light, more dramatic and golden-framed. 5 (passive, 축복): a soft blessing light falling from above, with a subtle circular frame.` |
| `summoner_skills.png` | 소환술사 | `Theme color: matches the hero "소환술사". 1 (Q, 해골 소환): two skeleton warriors rising from a purple portal. 2 (W, 저주): a purple cursed skull mark. 3 (E, 뼈 감옥): a cage made of bones trapping the ground. 4 (R, ultimate, 뼈 골렘): a large bone golem rising, more dramatic and golden-framed. 5 (passive, 영혼 수확): a purple soul flame being harvested, with a subtle circular frame.` |

참고용 스킬 설명:

- **암살자**: Q 그림자 찌르기 / W 독칼 던지기 / E 그림자 숨기 / R 처형 / 패시브 급소
- **검성**: Q 돌진 베기 / W 회전베기 / E 검기 방어 / R 일섬 / 패시브 검의 길
- **용기사**: Q 창 찌르기 / W 화염 숨결 / E 용비늘 / R 용 변신 / 패시브 용의 피
- **엘프 궁수**: Q 관통 화살 / W 가시 덫 / E 후퇴 도약 / R 화살비 / 패시브 바람의 가호
- **화염술사**: Q 화염구 / W 불기둥 / E 화염 도약 / R 메테오 / 패시브 점화
- **빙결술사**: Q 얼음 창 / W 서리 지대 / E 얼음 갑옷 / R 절대 영도 / 패시브 냉기
- **무투가**: Q 붕권 / W 연환격 / E 철벽 자세 / R 천붕권 / 패시브 연타
- **성기사**: Q 심판의 망치 / W 신성한 방패 / E 돌격 / R 신의 가호 / 패시브 수호의 맹세
- **성녀**: Q 빛의 화살 / W 치유 / E 정화의 빛 / R 부활의 기도 / 패시브 축복
- **소환술사**: Q 해골 소환 / W 저주 / E 뼈 감옥 / R 뼈 골렘 / 패시브 영혼 수확

## 6. 스킬 효과 그림 (선택, 효과 종류마다 한 장, 10장)

지금은 효과를 코드로 그린 입자로 보여 줍니다. 아래 그림을 주면 그 그림으로 바뀝니다(없는 종류는 지금처럼 입자).
효과 종류마다 그림 한 장에 가로 3칸(**바닥 무늬 · 터짐 · 투사체**)으로 만들고, `불 효과.png` 처럼 `<종류 이름> 효과.png` 로 저장합니다.

### 공통 앞부분

```
Original 2D game visual effect sprite sheet for a top-down mobile action game (not copied from any existing game).
Three separate effects side by side in a 3x1 row on a flat magenta (#FF00FF) background, with a clear magenta gap between them. Seen from directly above.
1 (left): a circular magic ground decal / area-of-effect circle, seen from straight above, glowing edges and inner pattern, fills its cell.
2 (middle): a bright circular explosion burst seen from above, radiating outward, glowing core.
3 (right): a small projectile flying to the RIGHT (pointing right), with a short glowing trail on its left side.
Bright hand-painted glowing style matching cel-shaded chibi heroes. No text, no characters.
Wide 1536x512 PNG.
```

### 종류별 뒷부분

| 파일 이름 | 종류 | 쓰는 스킬 | 뒷부분 |
|---|---|---|---|
| `불 효과.png` | fire | 화염술사, 용기사 숨결, 용암 거인 | `Theme: fire and lava. Orange-yellow flames, embers, a burning rune circle, a fiery explosion, a fireball.` |
| `얼음 효과.png` | ice | 빙결술사 | `Theme: ice and frost. Pale blue frozen ground with frost crystals, an icy shatter burst, an ice spear.` |
| `빛 효과.png` | holy | 성녀·성기사·검성 방어 | `Theme: holy light. Golden-white sacred circle with sun runes, a radiant light burst, a small arrow of light.` |
| `치유 효과.png` | heal | 성녀 치유·부활 | `Theme: healing. Soft green and gold circle with leaves and sparkles, a gentle healing bloom, a green light orb.` |
| `독 효과.png` | poison | 암살자 독칼 | `Theme: poison. Bubbling toxic green puddle, a green toxic splash, a poison-dripping dagger.` |
| `어둠 효과.png` | dark | 암살자·소환술사·고대 흑룡 | `Theme: dark magic. Purple-black cursed circle with skull runes, a dark purple shadow burst, a dark purple orb.` |
| `자연 효과.png` | nature | 엘프 궁수·숲의 수호정령 | `Theme: nature and wind. Green leafy thorny circle, a burst of leaves and wind, a green glowing arrow.` |
| `칼날 효과.png` | steel | 검성·용기사 창 | `Theme: blade energy. Golden-white sword slash marks in a circle, a crossed slash burst, a flying blade wave.` |
| `충격 효과.png` | impact | 무투가·성기사 돌격·골렘 | `Theme: ground impact. Cracked earth circle with dust, a shockwave dust burst, a small flying rock.` |
| `기본 효과.png` | arcane | 그 밖 | `Theme: arcane magic. Blue-white rune circle, an arcane sparkle burst, a blue magic bolt.` |

## 7. 새 영웅 6명 (PHASE 14)

모두 이 게임을 위해 새로 만든 오리지널 캐릭터입니다. 기존 작품의 캐릭터와 닮지 않게 그려 주세요.
기존 영웅 그림 한 장(예: 검성)을 첨부하고 "같은 화풍, 같은 시점, 같은 크기 비율로"라고 덧붙이면 화풍이 맞습니다. **캐릭터는 오른쪽 아래를 보게** 해 주세요.

### 7-1. 영웅 그림 (1번 항목의 공통 앞부분을 그대로 붙임)

| 파일 이름 | 영웅 | 프롬프트 뒷부분 |
|---|---|---|
| `그림자 닌자.png` | 그림자 닌자 | `Character: "Shadow Ninja", an original ninja in dark slate-blue (#59668C) outfit with a short tattered scarf, a metal forehead guard with a plain crescent mark, holding a kunai in each hand, low agile stance, faint shadow wisps.` |
| `총잡이.png` | 총잡이 | `Character: "Gunslinger", an original wild-west style sharpshooter with a wide-brim hat, tan duster coat (#D9995A), red bandana, holding two revolvers, confident grin.` |
| `기공사.png` | 기공사 | `Character: "Ki Master", an original martial artist in a golden-yellow and white training gi (#FFBF40) with a dark belt, long braided hair, palms gathering a glowing golden energy orb.` |
| `별빛 마법소녀.png` | 별빛 마법소녀 | `Character: "Starlight Magical Girl", an original magical girl in a pink and white frilled dress (#FF99CC) with star ornaments and ribbons, twin tails, holding a star-tipped wand, cheerful pose.` |
| `사신.png` | 사신 | `Character: "Reaper", an original grim reaper style warrior in a dark purple hooded cloak (#804D99), pale face with glowing eyes, holding a large curved scythe, purple soul wisps.` |
| `기계공.png` | 기계공 | `Character: "Mechanic", an original inventor with goggles on the forehead, teal work overalls (#73BFD9), a big wrench in one hand and a small hovering drone beside, tool belt.` |

소환수 2종 (2번 항목의 몬스터 공통 앞부분을 붙임):

| 파일 이름 | 소환수 | 프롬프트 뒷부분 |
|---|---|---|
| `그림자 분신.png` | 그림자 분신 | `Monster: a semi-transparent dark shadow copy of a ninja, featureless face with two glowing white eyes, holding a kunai, smoky edges.` |
| `자동 포탑.png` | 자동 포탑 | `Monster: a small stationary auto-turret on three metal legs with a single barrel and a teal glowing lens.` |

### 7-2. 스킬 아이콘 (5번 항목의 공통 앞부분을 그대로 붙임)

| 파일 이름 | 영웅 | 뒷부분 |
|---|---|---|
| `그림자 닌자 스킬.png` | 그림자 닌자 | `Theme color: dark slate blue and purple. 1 (Q): three shuriken flying in a fan. 2 (W): one ninja splitting into three shadow clones. 3 (E): a wooden log in a puff of smoke, substitution trick. 4 (R, ultimate): many shadow figures slashing from all sides, more dramatic and golden-framed. 5 (passive): a fading afterimage silhouette, with a subtle circular frame.` |
| `총잡이 스킬.png` | 총잡이 | `Theme color: tan and gold. 1 (Q): a bullet piercing through in a straight glowing line. 2 (W): a flashbang grenade bursting with white light. 3 (E): a figure doing a combat roll with dust. 4 (R, ultimate): two revolvers firing a storm of bullets, more dramatic and golden-framed. 5 (passive): a crosshair over a skull, with a subtle circular frame.` |
| `기공사 스킬.png` | 기공사 | `Theme color: golden yellow. 1 (Q): a palm shooting a glowing energy ball. 2 (W): a blurred figure appearing behind with a punch. 3 (E): a figure in a power stance surrounded by a rising golden aura. 4 (R, ultimate): a huge golden energy beam fired from two hands, more dramatic and golden-framed. 5 (passive): a burning fist with a shield glow, with a subtle circular frame.` |
| `별빛 마법소녀 스킬.png` | 별빛 마법소녀 | `Theme color: pink and white. 1 (Q): a shooting star with a sparkling trail. 2 (W): pink ribbons wrapping tightly in a knot. 3 (E): a pink megaphone with hearts and stars, cheering. 4 (R, ultimate): many stars raining down from the sky, more dramatic and golden-framed. 5 (passive): a star-shaped shield, with a subtle circular frame.` |
| `사신 스킬.png` | 사신 | `Theme color: dark purple. 1 (Q): a scythe sweeping in a wide crescent. 2 (W): glowing purple chains binding a soul. 3 (E): a ghostly hooded figure dashing forward. 4 (R, ultimate): a scythe dropping over a skull, death sentence, more dramatic and golden-framed. 5 (passive): a hand harvesting a small glowing soul, with a subtle circular frame.` |
| `기계공 스킬.png` | 기계공 | `Theme color: teal and steel. 1 (Q): a small auto-turret being deployed. 2 (W): a rocket with a flame trail. 3 (E): a device projecting a teal dome shield. 4 (R, ultimate): shells falling from the sky onto a target marker, more dramatic and golden-framed. 5 (passive): a wrench crossed with a gear and a green plus, with a subtle circular frame.` |

### 7-3. 새 영웅 전용 스킬 효과 (6번 항목의 공통 앞부분을 그대로 붙임, 선택)

새 영웅의 스킬은 그림이 없으면 영웅 색에 맞춘 입자로 나옵니다. 아래 그림을 주면 그 그림으로 바뀝니다. 가로 3칸(바닥 무늬 · 터짐 · 투사체)입니다.
**보라·분홍 계열은 마젠타 배경과 색이 비슷하니, 가능하면 진한 초록(#00FF00) 배경으로** 만들어 주세요(공통 앞부분의 magenta (#FF00FF) 를 green (#00FF00) 로 바꿈).

| 파일 이름 | 종류 | 쓰는 영웅 | 배경 | 뒷부분 |
|---|---|---|---|---|
| `별빛 효과.png` | star | 별빛 마법소녀 | 초록 | `Theme: cute starlight magic. Pink and white circle with stars, hearts and ribbons, a sparkling pink star burst, a pink shooting star with a glitter trail.` |
| `기공 효과.png` | ki | 기공사 | 마젠타 | `Theme: martial ki energy. Golden-yellow swirling energy circle with a yin-yang style spiral, a golden energy shockwave burst, a golden energy ball with a blazing trail.` |
| `총알 효과.png` | bullet | 총잡이 | 마젠타 | `Theme: gunfire. Circle of bullet casings and a crosshair scorch mark, a white-yellow muzzle flash burst with sparks, a glowing brass bullet with a speed streak.` |
| `그림자 효과.png` | shadow | 그림자 닌자 | 초록 | `Theme: ninja shadow. Dark blue-gray smoke circle with a shuriken mark, a dark smoke puff burst with flying leaves, a spinning steel shuriken with a dark trail.` |
| `영혼 효과.png` | soul | 사신 | 초록 | `Theme: reaper souls. Dark purple circle with pale teal ghost flames and a scythe mark, a burst of wailing teal soul wisps, a curved purple scythe-slash wave.` |
| `기계 효과.png` | tech | 기계공 | 마젠타 | `Theme: sci-fi gadgets. Teal hexagon hologram grid circle with a target marker, an electric teal explosion with bolts and gears, a small rocket with a flame trail.` |

## 8. PHASE 17 에서 바뀐 스킬 아이콘 (10장, 한 장에 한 개)

영웅마다 고유 장치를 넣으면서 스킬 내용이 바뀐 것들입니다. 지금은 예전 아이콘이나 글자로 나옵니다.
아이콘 **한 장에 하나씩** 만들고, 파일 이름을 아래 `파일 이름` 그대로 저장하면 정리 도구가 바로 넣습니다.

### 공통 앞부분 (한 장짜리)

```
Original fantasy game skill icon (not copied from any existing game).
A single square skill icon centered on a flat magenta (#FF00FF) background, with a magenta margin around it.
The icon is a rounded-square tile with its own painted dark background and a bold symbol in the center, readable at 64x64 pixels.
Bright hand-painted style matching cel-shaded chibi heroes, bold outline, glowing effects. No text, no numbers, no letters.
Square 1024x1024 PNG.
```

### 아이콘별 뒷부분

| 파일 이름 | 영웅 · 스킬 | 뒷부분 |
|---|---|---|
| `assassin_q.png` | 암살자 · 표식 단검 | `Theme color: crimson and purple. A thrown dagger trailing a red target-mark rune, with a faint shadow figure ready to blink behind it.` |
| `dragon_knight_tail.png` | 용기사(변신) · 꼬리치기 | `Theme color: red and orange. A spiked dragon tail sweeping in a wide arc, knocking rocks and dust away.` |
| `dragon_knight_soar.png` | 용기사(변신) · 비상 | `Theme color: red and orange. A red dragon diving down from the sky toward a glowing landing circle, wings spread.` |
| `frost_mage_e.png` | 빙결술사 · 얼음벽 | `Theme color: icy blue and white. A tall jagged wall of ice crystals rising from the ground, blocking the way.` |
| `monk_e.png` | 무투가 · 철산고 | `Theme color: orange and brown. A martial artist ramming forward with the shoulder, an enemy silhouette flying back into a cracked stone wall.` |
| `paladin_q.png` | 성기사 · 도발 | `Theme color: gold and white. A shield slammed into the ground with a golden shockwave and angry red exclamation-mark-shaped sparks drawn toward it (no letters).` |
| `star_girl_q.png` | 별빛 마법소녀 · 별 부메랑 | `Theme color: pink and white. A spinning star boomerang flying in a curved loop path with a sparkling trail.` |
| `star_girl_e.png` | 별빛 마법소녀 · 리본 연결 | `Theme color: pink and white. Two hands linked by a glowing pink ribbon with hearts and stars along it.` |
| `mechanic_e.png` | 기계공 · 정비 드론 | `Theme color: teal and steel. A small hovering repair drone with a wrench arm, beaming green repair light onto a turret.` |
| `ninja_w.png` | 그림자 닌자 · 분신술 | `Theme color: dark slate blue and purple. A ninja and one identical shadow clone standing back to back, with a swap arrow circling between them.` |

## 9. 영구 비약 아이콘 (PHASE 18, 5장)

3번 항목(아이템 아이콘)의 공통 앞부분을 그대로 붙입니다. 투명 배경이 어려우면 마젠타(#FF00FF) 배경도 됩니다.

| 파일 이름 | 아이템 | 뒷부분 |
|---|---|---|
| `strength_elixir.png` | 힘의 비약 | `Item: an ornate crystal potion bottle filled with glowing crimson liquid, a golden fist emblem on the bottle, sparks rising.` |
| `arcane_elixir.png` | 마력의 비약 | `Item: an ornate crystal potion bottle filled with swirling violet magic liquid, a golden star emblem, small arcane runes floating around.` |
| `vitality_elixir.png` | 생명의 비약 | `Item: an ornate crystal potion bottle filled with bright green glowing liquid, a golden heart emblem, a small leaf sprouting from the cork.` |
| `guard_elixir.png` | 강철의 비약 | `Item: a heavy steel-banded potion bottle filled with silvery liquid, a golden shield emblem, metallic shine.` |
| `swift_elixir.png` | 신속의 비약 | `Item: a slim crystal potion bottle filled with glowing golden-yellow liquid, a golden wing emblem, wind swirls around it.` |

## 10. 진행 상황

- 영구 비약 아이콘 5장(9번 항목)도 넣었습니다.

- PHASE 17 스킬 아이콘 10장(8번 항목)도 넣었습니다.

- 넣음: 영웅 10명과 용기사 변신, 몬스터 9종, 아이템 39개, 바닥 무늬 7개, 맵 물건·장식 전부, 스킬 아이콘 50개, 스킬 효과 그림 30장.
- 남음: 새 영웅 6명의 그림과 스킬 아이콘, 소환수 2종, 전용 스킬 효과 6장(선택) (7번 항목). 그림이 없는 동안은 색 원과 글자로 나옵니다.
