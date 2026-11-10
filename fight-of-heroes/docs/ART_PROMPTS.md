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

## 6. 진행 상황

- 넣음: 영웅 10명과 용기사 변신, 몬스터 9종, 아이템 39개, 바닥 무늬 7개, 맵 물건·장식 전부.
- 남음: 스킬 아이콘 50개 (5번 항목). 영웅 한 명씩 만들어 주셔도 됩니다. 아이콘이 없는 스킬은 지금처럼 글자로 그립니다.
