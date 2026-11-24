// 상황 회화 (말씨정원). 장면별 짧은 대화를 직접 지었다.
// 한 줄: 말하는 사람(A/B)|말|뜻|읽기(중국어 병음)
// 말하는 사람 뒤의 * 는 "앞 말에 대한 대답이 아님"(화제를 바꾸거나 이어서 말함) → 대답 고르기 문제로 내지 않는다
(function () {
  function C(title, dlg) { return { title: title, dlg: dlg }; }

  window.LANGS.ja.units.push({ title: '회화 · 생활 장면', level: 'CV', stages: [
    C('처음 만났을 때', `
A|はじめまして。キムです。|처음 뵙겠습니다. 김입니다.
B|はじめまして。田中です。|처음 뵙겠습니다. 다나카입니다.
A|田中さんは学生ですか。|다나카 씨는 학생이에요?
B|いいえ、会社員です。|아니요, 회사원이에요.
A*|よろしくお願いします。|잘 부탁합니다.
B|こちらこそ、よろしくお願いします。|저야말로 잘 부탁합니다.`),
    C('카페에서 주문', `
A|いらっしゃいませ。ご注文は？|어서 오세요. 주문하시겠어요?
B|アイスコーヒーをひとつください。|아이스커피 하나 주세요.
A|サイズはどうしますか。|사이즈는 어떻게 하시겠어요?
B|Mサイズでお願いします。|M 사이즈로 부탁해요.
A|店内でお召し上がりですか。|매장에서 드시고 가세요?
B|いいえ、持ち帰りで。|아니요, 포장이요.`),
    C('식당에서 주문하기', `
A|何名様ですか。|몇 분이세요?
B|二人です。|두 명이에요.
A|こちらへどうぞ。|이쪽으로 오세요.
B*|すみません、メニューをください。|저기요, 메뉴 주세요.
A*|お決まりですか。|정하셨어요?
B|ラーメンを二つお願いします。|라멘 두 개 부탁해요.`),
    C('가게에서 가격 묻기', `
A|すみません、これはいくらですか。|저기요, 이거 얼마예요?
B|三千円です。|3천 엔이에요.
A|ちょっと高いですね。|좀 비싸네요.
B|こちらは二千円です。|이건 2천 엔이에요.
A|じゃあ、これをください。|그럼 이걸로 주세요.
B|ありがとうございます。|감사합니다.`),
    C('길 묻기', `
A|すみません、駅はどこですか。|실례합니다, 역이 어디예요?
B|まっすぐ行って、右です。|쭉 가서 오른쪽이에요.
A|遠いですか。|멀어요?
B|いいえ、歩いて五分です。|아니요, 걸어서 5분이에요.
A|ありがとうございます。|고맙습니다.
B|どういたしまして。|천만에요.`),
    C('호텔 체크인', `
A|いらっしゃいませ。|어서 오세요.
B|予約したキムです。|예약한 김이에요.
A|パスポートをお願いします。|여권 부탁드립니다.
B|はい、どうぞ。|네, 여기요.
A*|お部屋は五階です。|방은 5층입니다.
B*|朝ごはんは何時からですか。|아침밥은 몇 시부터예요?`),
    C('약국·병원', `
A|どうしましたか。|어디가 불편하세요?
B|頭が痛いです。|머리가 아파요.
A|熱はありますか。|열은 있어요?
B|少しあります。|조금 있어요.
A|この薬を飲んでください。|이 약을 드세요.
B|一日に何回飲みますか。|하루에 몇 번 먹어요?`),
    C('약속 정하기', `
A|あした、ひまですか。|내일 시간 있어요?
B|はい、ひまです。|네, 한가해요.
A|いっしょに映画を見ませんか。|같이 영화 안 볼래요?
B|いいですね。何時にしますか。|좋아요. 몇 시로 할까요?
A|三時はどうですか。|3시 어때요?
B|じゃあ、三時に駅で会いましょう。|그럼 3시에 역에서 만나요.`),
    C('전철표 사기', `
A|東京駅まで、いくらですか。|도쿄역까지 얼마예요?
B|二百円です。|200엔이에요.
A|何番線ですか。|몇 번 승강장이에요?
B|三番線です。|3번 승강장이에요.
A|乗り換えはありますか。|갈아타야 해요?
B|いいえ、乗り換えはありません。|아니요, 안 갈아타도 돼요.`),
    C('날씨와 안부', `
A|おはようございます。今日は寒いですね。|안녕하세요. 오늘 춥네요.
B|そうですね。雪が降りそうです。|그러네요. 눈이 올 것 같아요.
A*|お元気ですか。|잘 지내세요?
B|はい、おかげさまで。|네, 덕분에요.
A*|週末は何をしますか。|주말에는 뭐 해요?
B|家でゆっくり休みます。|집에서 푹 쉴 거예요.`)
  ] });

  window.LANGS.zh.units.push({ title: '회화 · 생활 장면', level: 'CV', stages: [
    C('처음 만났을 때', `
A|你好！我叫美娜。|안녕하세요! 저는 미나예요.|nǐ hǎo! wǒ jiào Měinà.
B|你好！我叫王明。|안녕하세요! 저는 왕밍이에요.|nǐ hǎo! wǒ jiào Wáng Míng.
A|你是哪国人？|어느 나라 사람이에요?|nǐ shì nǎ guó rén?
B|我是中国人。|저는 중국 사람이에요.|wǒ shì Zhōngguó rén.
A*|认识你很高兴。|만나서 반가워요.|rènshi nǐ hěn gāoxìng.
B|我也很高兴。|저도 반가워요.|wǒ yě hěn gāoxìng.`),
    C('카페에서 주문', `
A|你好，要喝什么？|안녕하세요, 뭐 드시겠어요?|nǐ hǎo, yào hē shénme?
B|一杯冰美式，谢谢。|아이스 아메리카노 한 잔 주세요.|yì bēi bīng měishì, xièxie.
A|要大杯还是中杯？|큰 잔이요, 중간 잔이요?|yào dà bēi háishi zhōng bēi?
B|中杯。|중간 잔이요.|zhōng bēi.
A|在这儿喝还是带走？|여기서 드세요, 가져가세요?|zài zhèr hē háishi dàizǒu?
B|带走。|가져갈게요.|dàizǒu.`),
    C('식당에서 주문하기', `
A|欢迎光临！几位？|어서 오세요! 몇 분이세요?|huānyíng guānglín! jǐ wèi?
B|两位。|두 명이요.|liǎng wèi.
A|请坐，这是菜单。|앉으세요, 메뉴판이에요.|qǐng zuò, zhè shì càidān.
B|我要一个饺子和一碗面条。|만두 하나랑 국수 한 그릇 주세요.|wǒ yào yí ge jiǎozi hé yì wǎn miàntiáo.
A|要喝什么吗？|마실 건 필요하세요?|yào hē shénme ma?
B|两瓶水，谢谢。|물 두 병 주세요.|liǎng píng shuǐ, xièxie.`),
    C('가게에서 가격 묻기', `
A|这个多少钱？|이거 얼마예요?|zhège duōshao qián?
B|一百块。|100위안이에요.|yìbǎi kuài.
A|太贵了，便宜一点儿吧。|너무 비싸요, 좀 깎아 주세요.|tài guì le, piányi yìdiǎnr ba.
B|八十块，怎么样？|80위안 어때요?|bāshí kuài, zěnmeyàng?
A|好，我买了。|좋아요, 살게요.|hǎo, wǒ mǎi le.
B|谢谢，欢迎再来！|감사합니다, 또 오세요!|xièxie, huānyíng zài lái!`),
    C('길 묻기', `
A|请问，地铁站在哪儿？|실례지만, 지하철역이 어디예요?|qǐngwèn, dìtiězhàn zài nǎr?
B|一直走，然后往右拐。|쭉 가다가 오른쪽으로 도세요.|yìzhí zǒu, ránhòu wǎng yòu guǎi.
A|远吗？|멀어요?|yuǎn ma?
B|不远，走路五分钟。|안 멀어요, 걸어서 5분이에요.|bù yuǎn, zǒulù wǔ fēnzhōng.
A|谢谢你！|고마워요!|xièxie nǐ!
B|不客气。|천만에요.|bú kèqi.`),
    C('호텔 체크인', `
A|您好，有预订吗？|안녕하세요, 예약하셨어요?|nín hǎo, yǒu yùdìng ma?
B|有，我叫金美娜。|네, 김미나예요.|yǒu, wǒ jiào Jīn Měinà.
A|请给我您的护照。|여권 주세요.|qǐng gěi wǒ nín de hùzhào.
B|给您。|여기요.|gěi nín.
A*|您的房间在五楼。|방은 5층이에요.|nín de fángjiān zài wǔ lóu.
B*|早饭几点开始？|아침은 몇 시에 시작해요?|zǎofàn jǐ diǎn kāishǐ?`),
    C('약국·병원', `
A|你哪儿不舒服？|어디가 불편하세요?|nǐ nǎr bù shūfu?
B|我头疼。|머리가 아파요.|wǒ tóu téng.
A|发烧吗？|열 나요?|fāshāo ma?
B|有一点儿。|조금 나요.|yǒu yìdiǎnr.
A|这个药一天吃三次。|이 약은 하루에 세 번 드세요.|zhège yào yì tiān chī sān cì.
B|饭前吃还是饭后吃？|식전에 먹어요, 식후에 먹어요?|fàn qián chī háishi fàn hòu chī?`),
    C('약속 정하기', `
A|明天你有空儿吗？|내일 시간 있어?|míngtiān nǐ yǒu kòngr ma?
B|有空儿，怎么了？|있어, 왜?|yǒu kòngr, zěnme le?
A|我们一起去看电影吧。|우리 같이 영화 보러 가자.|wǒmen yìqǐ qù kàn diànyǐng ba.
B|好啊！几点见？|좋아! 몇 시에 만나?|hǎo a! jǐ diǎn jiàn?
A|下午三点怎么样？|오후 세 시 어때?|xiàwǔ sān diǎn zěnmeyàng?
B|行，三点在地铁站见。|좋아, 세 시에 지하철역에서 만나.|xíng, sān diǎn zài dìtiězhàn jiàn.`),
    C('기차표 사기', `
A|我要一张去上海的票。|상하이 가는 표 한 장 주세요.|wǒ yào yì zhāng qù Shànghǎi de piào.
B|几点的？|몇 시 거요?|jǐ diǎn de?
A|上午十点的。|오전 열 시 거요.|shàngwǔ shí diǎn de.
B|一共五百块。|모두 500위안이에요.|yígòng wǔbǎi kuài.
A|可以刷卡吗？|카드 돼요?|kěyǐ shuā kǎ ma?
B|可以。|돼요.|kěyǐ.`),
    C('날씨와 안부', `
A|最近怎么样？|요즘 어때?|zuìjìn zěnmeyàng?
B|挺好的，你呢？|잘 지내, 너는?|tǐng hǎo de, nǐ ne?
A|我也很好。今天真冷啊！|나도 잘 지내. 오늘 정말 춥다!|wǒ yě hěn hǎo. jīntiān zhēn lěng a!
B|是啊，明天会下雪。|그러게, 내일 눈 온대.|shì a, míngtiān huì xià xuě.
A*|周末你做什么？|주말에 뭐 해?|zhōumò nǐ zuò shénme?
B|在家休息。|집에서 쉬어.|zài jiā xiūxi.`)
  ] });

  window.LANGS.en.units.push({ title: '회화 · 생활 장면', level: 'CV', stages: [
    C('처음 만났을 때', `
A|Hi, I'm Mina. Nice to meet you.|안녕하세요, 미나예요. 반가워요.
B|Nice to meet you too. I'm Tom.|저도 반가워요. 저는 톰이에요.
A|Where are you from?|어디서 왔어요?
B|I'm from Canada.|캐나다에서 왔어요.
A*|What do you do?|무슨 일 하세요?
B|I'm a teacher.|선생님이에요.`),
    C('카페에서 주문', `
A|Hi, what can I get for you?|안녕하세요, 뭐 드릴까요?
B|Can I have an iced latte, please?|아이스 라테 한 잔 주시겠어요?
A|What size would you like?|사이즈는 어떻게 하시겠어요?
B|A medium, please.|중간 사이즈요.
A|For here or to go?|드시고 가세요, 가져가세요?
B|To go, please.|가져갈게요.`),
    C('식당에서 주문하기', `
A|How many people?|몇 분이세요?
B|Two, please.|두 명이요.
A*|Are you ready to order?|주문하시겠어요?
B|Yes, I'll have the pasta.|네, 파스타로 할게요.
A|Anything to drink?|마실 건요?
B|Just water, please.|물만 주세요.`),
    C('가게에서 가격 묻기', `
A|Excuse me, how much is this?|실례지만, 이거 얼마예요?
B|It's twenty dollars.|20달러예요.
A*|Do you have it in blue?|파란색도 있어요?
B|Yes, here you are.|네, 여기 있어요.
A*|Can I try it on?|입어 봐도 돼요?
B|Sure, the fitting room is over there.|그럼요, 탈의실은 저쪽이에요.`),
    C('길 묻기', `
A|Excuse me, where is the station?|실례합니다, 역이 어디예요?
B|Go straight and turn right.|쭉 가서 오른쪽으로 도세요.
A|Is it far from here?|여기서 멀어요?
B|No, it's a five-minute walk.|아니요, 걸어서 5분이에요.
A|Thank you so much.|정말 고마워요.
B|You're welcome.|천만에요.`),
    C('호텔 체크인', `
A|Good evening. Do you have a reservation?|안녕하세요. 예약하셨어요?
B|Yes, my name is Mina Kim.|네, 김미나예요.
A|Can I see your passport, please?|여권 좀 보여 주시겠어요?
B|Here it is.|여기 있어요.
A*|Your room is on the fifth floor.|방은 5층이에요.
B*|What time is breakfast?|아침은 몇 시예요?`),
    C('약국·병원', `
A|What's wrong?|어디가 안 좋으세요?
B|I have a headache.|머리가 아파요.
A|Do you have a fever?|열이 있어요?
B|Yes, a little.|네, 조금요.
A|Take this medicine three times a day.|이 약을 하루에 세 번 드세요.
B|Before or after meals?|식전에요, 식후에요?`),
    C('약속 정하기', `
A|Are you free tomorrow?|내일 시간 있어?
B|Yes, why?|응, 왜?
A|Let's go see a movie.|영화 보러 가자.
B|Sounds good! What time?|좋아! 몇 시에?
A|How about three o'clock?|3시 어때?
B|Okay, see you at the station.|좋아, 역에서 봐.`),
    C('버스·기차표 사기', `
A|One ticket to Boston, please.|보스턴 가는 표 한 장 주세요.
B|One way or round trip?|편도요, 왕복이요?
A|Round trip, please.|왕복이요.
B|That's forty dollars.|40달러예요.
A|Can I pay by card?|카드로 내도 돼요?
B|Of course.|물론이죠.`),
    C('날씨와 안부', `
A|How are you doing?|요즘 어때요?
B|I'm good, thanks. And you?|잘 지내요, 고마워요. 당신은요?
A|Pretty good. It's cold today, isn't it?|잘 지내요. 오늘 춥죠?
B|Yes, it might snow tonight.|네, 오늘 밤에 눈이 올지도 몰라요.
A|What are you doing this weekend?|이번 주말에 뭐 해요?
B|I'm just going to relax at home.|그냥 집에서 쉬려고요.`)
  ] });
})();
