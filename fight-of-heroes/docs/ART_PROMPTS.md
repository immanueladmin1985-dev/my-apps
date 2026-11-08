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

## 5. 우선순위

전부 만들기 부담스러우면 아래 순서로 만들어 주세요. 앞쪽부터 게임 화면에 미치는 효과가 큽니다.

1. 영웅 10장
2. `ground_grass.png`, `wall_rock.png`, `base_fountain.png`, `shop.png`, `center_stage.png`
3. 몬스터 9장
4. 아이템 39장
5. 나머지 바닥 무늬와 장식
