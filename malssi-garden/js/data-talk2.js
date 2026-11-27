// 생활 회화 코스 (말씨정원, 영어 A2·중국어 첫걸음).
// 흔히 쓰는 A2 / 입문 문법 순서에 맞춰 마을 주민과 나누는 대화를 직접 지었다.
// 과마다 학습 포인트 하나와 "자주 쓰는 표현" 하나를 함께 배운다. 대화 줄 형식은 data-conv.js 와 같다.
(function () {
  function T(lang, title, point, ex, dlg) {
    var rule = point + '<div class="ono"><span>자주 쓰는 표현</span><b class="lang-' + lang + '">' + ex[0] + '</b><small>' + ex[1] + '</small></div>';
    return { title: title, rule: rule, dlg: dlg };
  }
  var E = function (t, p, x, d) { return T('en', t, p, x, d); }, Z = function (t, p, x, d) { return T('zh', t, p, x, d); };

  window.LANGS.en.units.push({ title: '생활 회화 A2 · 1 (1~12과)', level: 'CO', stages: [
    E('1과 · Nice to meet you', '<p><b>be동사</b>: I <b>am</b> / you·we·they <b>are</b> / he·she·it <b>is</b>.</p><p>줄여 말하기: I\'m, you\'re, she\'s. 부정은 <b>not</b>: I\'m not.</p>', ['Nice to meet you, too.', '저도 만나서 반가워요.'], `
A|Hi, I'm Bear. I live next door.|안녕하세요, 저는 곰이에요. 옆집에 살아요.
B|Hi, I'm Kim. Nice to meet you.|안녕하세요, 김이에요. 만나서 반가워요.
A|Nice to meet you, too. Are you a student?|저도요. 학생이에요?
B|No, I'm not. I'm a nurse.|아니요. 간호사예요.
A*|Welcome to our village!|우리 마을에 온 걸 환영해요!
B|Thank you. It's a lovely place.|고마워요. 멋진 곳이네요.`),
    E('2과 · My daily routine', '<p><b>현재 시제</b>는 늘 하는 일. he·she·it 뒤에는 동사에 <b>-s</b>: She <b>gets</b> up at seven.</p><p>빈도: always, usually, often, sometimes, never.</p>', ['What time do you usually…?', '보통 몇 시에 ~해요?'], `
A|What time do you usually get up?|보통 몇 시에 일어나요?
B|I usually get up at seven.|보통 7시에 일어나요.
A|What do you have for breakfast?|아침은 뭘 먹어요?
B|I often have toast and milk.|자주 토스트랑 우유를 먹어요.
A*|Panda never gets up before ten!|판다는 절대 10시 전에 안 일어나요!
B|Ha ha, he loves sleeping.|하하, 자는 걸 정말 좋아하네요.`),
    E('3과 · Do you like…?', '<p>현재 시제 질문: <b>Do</b> you…? / <b>Does</b> she…? 대답은 Yes, I do. / No, she doesn\'t.</p>', ['I\'m a big fan of…', '~을 정말 좋아해요'], `
A|Do you like spicy food?|매운 음식 좋아해요?
B|Yes, I do. I'm a big fan of kimchi.|네, 좋아해요. 김치를 정말 좋아해요.
A|Does your husband like it, too?|남편도 좋아해요?
B|No, he doesn't. He likes sweet food.|아니요, 안 좋아해요. 단 음식을 좋아해요.
A*|Then he'll love Bear's honey cake.|그럼 곰네 꿀케이크를 좋아하겠네요.
B|I'm sure he will!|분명 그럴 거예요!`),
    E('4과 · What are you doing?', '<p><b>현재 진행형</b>: be + 동사<b>-ing</b> = 지금 ~하고 있다. I\'m cooking. / What are you doing?</p>', ['Can I give you a hand?', '좀 도와줄까요?'], `
A|Hi, Kim! What are you doing?|안녕, 김! 뭐 하고 있어요?
B|I'm planting flowers.|꽃을 심고 있어요.
A|Can I give you a hand?|좀 도와줄까요?
B|Thanks! Could you bring some water?|고마워요! 물 좀 갖다줄래요?
A*|Look, Squirrel is watching us.|봐요, 다람쥐가 우리를 보고 있어요.
B|Ha ha, she wants to help, too.|하하, 걔도 돕고 싶은가 봐요.`),
    E('5과 · There is a bakery', '<p><b>There is</b> + 하나 / <b>There are</b> + 여럿 = ~이 있다. 질문은 Is there…? / Are there…?</p>', ['It\'s just around the corner.', '모퉁이만 돌면 바로 있어요.'], `
A|Excuse me, is there a bakery near here?|실례지만, 이 근처에 빵집 있어요?
B|Yes, there is. It's just around the corner.|네, 있어요. 모퉁이만 돌면 바로예요.
A|Are there any cafes, too?|카페도 있어요?
B|Yes, there are two cafes on Main Street.|네, 큰길에 카페가 두 개 있어요.
A|Thank you very much.|정말 고마워요.
B|You're welcome.|천만에요.`),
    E('6과 · How much is it?', '<p>가격: <b>How much is</b> this? / <b>How much are</b> these?</p><p>this·that(하나) ↔ these·those(여럿).</p>', ['I\'ll take it.', '이걸로 할게요(살게요).'], `
A|Can I help you?|도와드릴까요?
B|How much are these apples?|이 사과들 얼마예요?
A|They're two dollars each.|하나에 2달러예요.
B|And how much is that pie?|그리고 저 파이는 얼마예요?
A|It's ten dollars.|10달러예요.
B|Okay, I'll take it.|좋아요, 그걸로 살게요.`),
    E('7과 · Last weekend', '<p><b>과거 시제</b>: 규칙 동사 + <b>-ed</b>(played, visited). 불규칙: go → <b>went</b>, have → <b>had</b>, see → <b>saw</b>.</p>', ['How was your weekend?', '주말 어땠어요?'], `
A|How was your weekend?|주말 어땠어요?
B|It was great! I went to the beach.|좋았어요! 바닷가에 갔어요.
A|What did you do there?|거기서 뭐 했어요?
B|I swam and had a picnic.|수영하고 소풍을 즐겼어요.
A*|I stayed home and watched movies.|저는 집에서 영화를 봤어요.
B|That sounds relaxing.|편안했겠네요.`),
    E('8과 · Did you see it?', '<p>과거 질문·부정은 <b>did</b>: Did you see…? / I <b>didn\'t</b> see… (동사는 원래 모양).</p>', ['You won\'t believe it!', '믿기지 않을걸요!'], `
A|Did you see the shooting star last night?|어젯밤에 별똥별 봤어요?
B|No, I didn't. I went to bed early.|아니요, 못 봤어요. 일찍 잤어요.
A|You won't believe it! It was so bright.|믿기지 않을걸요! 정말 밝았어요.
B|Did you make a wish?|소원 빌었어요?
A|Yes, but it's a secret.|네, 그런데 비밀이에요.`),
    E('9과 · Can you swim?', '<p><b>can</b> + 동사원형 = ~할 수 있다. 부정 <b>can\'t</b>. 질문 Can you…?</p>', ['Not really.', '별로요, 잘 못해요.'], `
A|Can you swim?|수영할 수 있어요?
B|Not really. I can only float.|잘 못해요. 물에 뜨는 것만 해요.
A|Otter can teach you. He's a great swimmer.|수달이 가르쳐 줄 수 있어요. 수영을 정말 잘해요.
B|Really? Can he teach me this Saturday?|정말요? 이번 토요일에 가르쳐 줄 수 있을까요?
A|I'll ask him.|제가 물어볼게요.`),
    E('10과 · Going to', '<p>계획: <b>be going to</b> + 동사 = ~할 거예요. I\'m going to visit my mom.</p>', ['Have fun!', '재미있게 보내요!'], `
A|What are you going to do this weekend?|이번 주말에 뭐 할 거예요?
B|I'm going to visit my parents.|부모님 댁에 갈 거예요.
A|Are you going to drive?|운전해서 갈 거예요?
B|No, I'm going to take the train.|아니요, 기차 탈 거예요.
A|Have fun!|재미있게 보내요!
B|Thanks, I will.|고마워요, 그럴게요.`),
    E('11과 · Bigger and better', '<p><b>비교급</b>: 짧은 형용사 + <b>-er</b>(bigger, cheaper), 긴 형용사는 <b>more</b> + 형용사(more expensive) + <b>than</b>.</p>', ['It\'s a good deal.', '괜찮은 가격이에요(잘 산 거예요).'], `
A|Which bag is better, the red one or the blue one?|빨간 가방이랑 파란 가방 중에 뭐가 나아요?
B|The blue one is bigger.|파란 게 더 커요.
A|But it's more expensive than the red one.|그런데 빨간 것보다 더 비싸요.
B|Only a little. It's a good deal.|조금만요. 괜찮은 가격이에요.
A|Okay, I'll get the blue one.|좋아요, 파란 걸로 할게요.`),
    E('12과 · The best in town', '<p><b>최상급</b>: <b>the</b> + 형용사<b>-est</b>(the biggest) / <b>the most</b> + 긴 형용사(the most popular).</p>', ['You should try it.', '한번 먹어 봐요(해 봐요).'], `
A|What's the most popular dish here?|여기서 제일 인기 있는 요리가 뭐예요?
B|The fish soup. It's the best in town.|생선 수프요. 이 동네에서 제일 맛있어요.
A|Is it spicy?|매워요?
B|A little. You should try it.|조금요. 한번 먹어 봐요.
A|Okay, one fish soup, please.|좋아요, 생선 수프 하나 주세요.`)
  ] });

  window.LANGS.en.units.push({ title: '생활 회화 A2 · 2 (13~24과)', level: 'CO', stages: [
    E('13과 · Have you ever…?', '<p><b>현재완료(경험)</b>: have + 과거분사. Have you ever <b>been</b> to Japan? / I\'ve never <b>tried</b> it.</p>', ['Once in a while.', '가끔요.'], `
A|Have you ever been to Japan?|일본에 가 본 적 있어요?
B|Yes, I have. I went there last year.|네, 있어요. 작년에 갔어요.
A|Have you ever tried natto?|낫토 먹어 본 적 있어요?
B|No, I've never tried it.|아니요, 한 번도 안 먹어 봤어요.
A*|It smells strange, but it's healthy.|냄새는 이상해도 몸에 좋아요.
B|Maybe I'll try it next time.|다음엔 먹어 볼지도요.`),
    E('14과 · I\'ve just finished', '<p>현재완료: <b>just</b>(방금), <b>already</b>(벌써), <b>yet</b>(아직, 부정·질문).</p><p>Have you finished <b>yet</b>? / I\'ve <b>just</b> finished.</p>', ['No rush.', '서두르지 않아도 돼요.'], `
A|Have you finished your homework yet?|숙제 벌써 끝냈어요?
B|Yes, I've just finished it.|네, 방금 끝냈어요.
A*|I haven't started mine yet.|저는 아직 시작도 안 했어요.
B|Do you need any help?|도움 필요해요?
A|Maybe later. No rush.|나중에요. 급하지 않아요.`),
    E('15과 · You should rest', '<p>충고: <b>should</b> + 동사 = ~하는 게 좋겠어요. 부정 <b>shouldn\'t</b>.</p>', ['Take care of yourself.', '몸 잘 챙겨요.'], `
A|You look tired. Are you okay?|피곤해 보여요. 괜찮아요?
B|I have a headache.|머리가 아파요.
A|You should go home and rest.|집에 가서 쉬는 게 좋겠어요.
B|You're right. I shouldn't stay up so late.|맞아요. 그렇게 늦게까지 안 자면 안 되겠어요.
A|Take care of yourself.|몸 잘 챙겨요.
B|Thanks, I will.|고마워요, 그럴게요.`),
    E('16과 · I have to go', '<p>의무: <b>have to</b> + 동사 = ~해야 해요. 안 해도 될 때는 <b>don\'t have to</b>.</p>', ['Catch you later.', '나중에 봐요.'], `
A|Do you want to get some coffee?|커피 마실래요?
B|Sorry, I have to go to work.|미안해요, 일하러 가야 해요.
A|Do you have to work on Saturday, too?|토요일에도 일해야 해요?
B|No, I don't have to work on weekends.|아니요, 주말에는 안 해도 돼요.
A|Then let's meet on Saturday.|그럼 토요일에 만나요.
B|Sounds good. Catch you later!|좋아요. 나중에 봐요!`),
    E('17과 · Will you…?', '<p><b>will</b>: 그 자리에서 정한 일·미래 예측·부탁. I\'ll help you. / Will you open the door?</p>', ['I\'ll get it.', '제가 할게요(받을게요).'], `
A*|Oh no, it's raining!|이런, 비가 와요!
B|Don't worry. I'll lend you my umbrella.|걱정 마요. 제 우산 빌려줄게요.
A|Thank you! Will you be okay?|고마워요! 괜찮겠어요?
B|Yes, I'll take a taxi.|네, 택시 탈게요.
A|I'll give it back tomorrow.|내일 돌려줄게요.`),
    E('18과 · When I was a child', '<p><b>was/were</b> + 과거 시제로 옛날 이야기. <b>used to</b> + 동사 = 예전에는 ~하곤 했다.</p>', ['Those were the days.', '그때가 좋았지요.'], `
A|What were you like when you were a child?|어렸을 때 어떤 아이였어요?
B|I was very shy.|아주 수줍음이 많았어요.
A|Really? You're so friendly now!|정말요? 지금은 정말 친근한데요!
B|I used to hide behind my mom.|엄마 뒤에 숨곤 했어요.
A*|I used to climb trees all day.|저는 하루 종일 나무에 올라가곤 했어요.
B|Ha ha, those were the days.|하하, 그때가 좋았죠.`),
    E('19과 · While I was walking', '<p><b>과거 진행형</b>: was/were + -ing. 다른 일이 끼어들면 <b>when</b> + 과거: I was walking <b>when</b> I saw…</p>', ['What a surprise!', '이게 웬일이에요!'], `
A|Guess what happened this morning!|오늘 아침에 무슨 일이 있었는지 알아요?
B|What happened?|무슨 일이요?
A|I was walking in the forest when I saw a deer.|숲을 걷고 있는데 사슴을 봤어요.
B|What a surprise! What was it doing?|이게 웬일이에요! 뭐 하고 있었어요?
A|It was eating flowers.|꽃을 먹고 있었어요.`),
    E('20과 · Could you…?', '<p>정중한 부탁: <b>Could you</b> + 동사, please? 허락은 <b>Could I</b>…? / <b>May I</b>…?</p>', ['No problem at all.', '전혀 문제없어요.'], `
A|Excuse me, could you help me?|실례지만, 좀 도와주실래요?
B|Sure. What's the problem?|그럼요. 무슨 일이에요?
A|Could you tell me the way to the station?|역 가는 길 좀 알려 주실래요?
B|Go straight and turn left at the bank.|쭉 가서 은행에서 왼쪽으로 도세요.
A|Thank you so much.|정말 고마워요.
B|No problem at all.|전혀 문제없어요.`),
    E('21과 · If it rains', '<p><b>If</b> + 현재, <b>will</b> + 동사 = 만약 ~하면 ~할 거예요. If it rains, we\'ll stay home.</p>', ['Let\'s wait and see.', '두고 봐요.'], `
A|Are we still going on a picnic tomorrow?|내일 아직 소풍 가는 거예요?
B|If it rains, we'll stay home.|비가 오면 집에 있을 거예요.
A|What will we do at home?|집에서 뭐 할 건데요?
B|If we stay home, we'll bake cookies.|집에 있으면 쿠키를 구울 거예요.
A|That sounds fun, too!|그것도 재미있겠네요!
B|Let's wait and see.|두고 봐요.`),
    E('22과 · Something to drink', '<p>some(긍정)·any(부정·질문), <b>something / anything / nothing</b>. Would you like <b>something</b> to drink?</p>', ['Make yourself at home.', '편하게 있어요.'], `
A|Come in! Make yourself at home.|들어와요! 편하게 있어요.
B|Thank you. Your house is so cozy.|고마워요. 집이 정말 아늑하네요.
A|Would you like something to drink?|뭐 마실래요?
B|Just some water, please.|그냥 물 좀 주세요.
A*|Sorry, I don't have any snacks.|미안해요, 간식이 하나도 없어요.
B|That's okay. I brought some cookies!|괜찮아요. 제가 쿠키 가져왔어요!`),
    E('23과 · It was made by…', '<p><b>수동태</b>: be + 과거분사 (+ by 누구) = ~에 의해 ~되다. This scarf <b>was made by</b> Sheep.</p>', ['It\'s one of a kind.', '세상에 하나뿐이에요.'], `
A|What a beautiful scarf!|목도리 정말 예쁘네요!
B|Thanks. It was made by Sheep.|고마워요. 양이 만들었어요.
A|Wow, it's one of a kind.|와, 세상에 하나뿐이네요.
B*|And this cup was painted by my son.|그리고 이 컵은 제 아들이 그렸어요.
A|He's very talented!|재능이 대단하네요!`),
    E('24과 · See you soon', '<p>헤어질 때: <b>Keep in touch.</b>(연락하고 지내요) <b>I\'ll miss you.</b>(보고 싶을 거예요)</p><p><b>thanks to</b> ~ = ~ 덕분에.</p>', ['Take care!', '잘 지내요!'], `
B*|I'm moving to the city next week.|다음 주에 도시로 이사 가요.
A|Oh no! I'll miss you.|이런! 보고 싶을 거예요.
B|Thanks to you, I loved living here.|덕분에 여기 사는 게 정말 좋았어요.
A|Let's keep in touch.|연락하고 지내요.
B|Of course. I'll write to you.|물론이죠. 편지할게요.
A|Take care!|잘 지내요!`)
  ] });

  window.LANGS.zh.units.push({ title: '첫걸음 회화 1 (1~12과)', level: 'CO', stages: [
    Z('1과 · 你好', '<p><b>A 是 B</b> = A는 B예요. 부정은 <b>不是</b>. 물을 때는 끝에 <b>吗</b>.</p>', ['认识你很高兴。', '만나서 반가워요.'], `
A|你好！我是熊。|안녕하세요! 저는 곰이에요.|nǐ hǎo! wǒ shì xióng.
B|你好！我叫金美娜。|안녕하세요! 저는 김미나예요.|nǐ hǎo! wǒ jiào Jīn Měinà.
A|你是学生吗？|학생이에요?|nǐ shì xuésheng ma?
B|不是，我是护士。|아니요, 저는 간호사예요.|bú shì, wǒ shì hùshi.
A*|认识你很高兴。|만나서 반가워요.|rènshi nǐ hěn gāoxìng.
B|我也很高兴。|저도 반가워요.|wǒ yě hěn gāoxìng.`),
    Z('2과 · 这是什么', '<p>가까운 것 <b>这</b>, 먼 것 <b>那</b>, 어느 것 <b>哪</b>. 무엇은 <b>什么</b>, 누구 것은 <b>谁的</b>.</p>', ['真可爱！', '정말 귀엽다!'], `
A|这是什么？|이건 뭐예요?|zhè shì shénme?
B|这是松果。|이건 솔방울이에요.|zhè shì sōngguǒ.
A|是谁的？|누구 거예요?|shì shéi de?
B|是松鼠的。|다람쥐 거예요.|shì sōngshǔ de.
A*|真可爱！|정말 귀엽다!|zhēn kě'ài!
B|对，她很喜欢。|맞아요, 걔가 정말 좋아해요.|duì, tā hěn xǐhuan.`),
    Z('3과 · 洗手间在哪儿', '<p>위치: <b>A 在 장소</b> = A는 ~에 있어요. 어디는 <b>哪儿</b>. 左边 왼쪽, 右边 오른쪽, 前边 앞.</p>', ['请问…', '실례지만… (물어볼 때)'], `
B*|请问，洗手间在哪儿？|실례지만, 화장실은 어디예요?|qǐngwèn, xǐshǒujiān zài nǎr?
A|在那儿，楼梯的右边。|저기요, 계단 오른쪽이에요.|zài nàr, lóutī de yòubian.
B|谢谢！|고마워요!|xièxie!
A|不客气。|천만에요.|bú kèqi.
B*|出口在哪儿？|출구는 어디예요?|chūkǒu zài nǎr?
A|出口在前边。|출구는 앞쪽이에요.|chūkǒu zài qiánbian.`),
    Z('4과 · 我回来了', '<p>집에서 쓰는 말: <b>我回来了</b>(다녀왔어요) ↔ <b>你回来了</b>(왔구나).</p><p>먹기 전에는 <b>我开动了</b>, 맛있다는 <b>好吃</b>.</p>', ['好香啊！', '냄새 정말 좋다!'], `
B*|我回来了！|다녀왔어요!|wǒ huílai le!
A|你回来了！饭做好了。|왔구나! 밥 다 됐어.|nǐ huílai le! fàn zuò hǎo le.
B|好香啊！我开动了。|냄새 정말 좋다! 잘 먹겠습니다.|hǎo xiāng a! wǒ kāidòng le.
A|好吃吗？|맛있어?|hǎochī ma?
B|很好吃！|정말 맛있어요!|hěn hǎochī!`),
    Z('5과 · 我的宝贝', '<p><b>的</b> = ~의. <b>我的书包</b> 내 가방. 가족·친한 사이에서는 的를 빼기도 해요: 我妈妈.</p>', ['太好看了！', '너무 예쁘다!'], `
A*|这是你的书包吗？|이거 네 가방이야?|zhè shì nǐ de shūbāo ma?
B|是，是我的。|응, 내 거야.|shì, shì wǒ de.
A|太好看了！|너무 예쁘다!|tài hǎokàn le!
B|谢谢。这是我妈妈的礼物。|고마워. 엄마가 준 선물이야.|xièxie. zhè shì wǒ māma de lǐwù.
A*|里面有什么？|안에 뭐가 있어?|lǐmiàn yǒu shénme?
B|有我的宝贝照片。|내 보물 사진이 있어.|yǒu wǒ de bǎobèi zhàopiàn.`),
    Z('6과 · 多少钱', '<p>가격: <b>多少钱？</b> 돈 단위 <b>块</b>(=元). 개수 + 양사: 一<b>个</b>, 两<b>个</b> (2는 两).</p>', ['便宜一点儿吧。', '좀 싸게 해 주세요.'], `
B*|老板，苹果多少钱一个？|사장님, 사과 하나에 얼마예요?|lǎobǎn, píngguǒ duōshao qián yí ge?
A|三块钱一个。|하나에 3위안이에요.|sān kuài qián yí ge.
B|有点儿贵，便宜一点儿吧。|좀 비싸네요, 좀 싸게 해 주세요.|yǒudiǎnr guì, piányi yìdiǎnr ba.
A|好吧，两块五。|좋아요, 2.5위안.|hǎo ba, liǎng kuài wǔ.
B|我要两个。|두 개 주세요.|wǒ yào liǎng ge.`),
    Z('7과 · 有没有', '<p><b>有</b> = 있다, 부정은 <b>没有</b>(不有는 안 써요). 질문은 <b>有没有</b>…? 또는 有…吗?</p>', ['卖完了。', '다 팔렸어요.'], `
B*|有没有草莓蛋糕？|딸기 케이크 있어요?|yǒu méiyǒu cǎoméi dàngāo?
A|对不起，今天卖完了。|죄송해요, 오늘은 다 팔렸어요.|duìbuqǐ, jīntiān mài wán le.
B|那有巧克力蛋糕吗？|그럼 초콜릿 케이크는 있어요?|nà yǒu qiǎokèlì dàngāo ma?
A|有。你要几块？|있어요. 몇 조각 드릴까요?|yǒu. nǐ yào jǐ kuài?
B|两块。|두 조각이요.|liǎng kuài.`),
    Z('8과 · 请再说一遍', '<p>못 알아들었을 때: <b>请再说一遍</b>(한 번 더 말해 주세요), <b>请说慢一点儿</b>(천천히 말해 주세요).</p>', ['我听不懂。', '못 알아듣겠어요.'], `
A|你好，你叫什么名字？|안녕하세요, 이름이 뭐예요?|nǐ hǎo, nǐ jiào shénme míngzi?
B|对不起，请再说一遍。|죄송해요, 한 번 더 말해 주세요.|duìbuqǐ, qǐng zài shuō yí biàn.
A|你叫什么名字？|이름이 뭐예요?|nǐ jiào shénme míngzi?
B|我叫美娜。|미나예요.|wǒ jiào Měinà.
A*|你的中文很好！|중국어 잘하네요!|nǐ de Zhōngwén hěn hǎo!
B|哪里哪里，还差得远。|별말씀을요, 아직 멀었어요.|nǎli nǎli, hái chà de yuǎn.`),
    Z('9과 · 几点开始', '<p>시간: <b>几点</b> 몇 시. <b>从</b>…<b>到</b>… = ~부터 ~까지.</p><p>권할 때는 <b>…吧</b>(~하자).</p>', ['不见不散！', '꼭 만나요! (볼 때까지 안 헤어져요)'], `
B*|晚会几点开始？|파티는 몇 시에 시작해요?|wǎnhuì jǐ diǎn kāishǐ?
A|晚上六点开始。|저녁 6시에 시작해요.|wǎnshang liù diǎn kāishǐ.
B|到几点？|몇 시까지예요?|dào jǐ diǎn?
A|从六点到九点。|6시부터 9시까지요.|cóng liù diǎn dào jiǔ diǎn.
A*|我们一起去吧！|우리 같이 가요!|wǒmen yìqǐ qù ba!
B|好，不见不散！|좋아요, 꼭 만나요!|hǎo, bú jiàn bú sàn!`),
    Z('10과 · 正在做什么', '<p>진행: <b>正在</b> + 동사 (+ 呢) = 지금 ~하고 있어요. 他正在睡觉呢。</p>', ['别打扰他。', '방해하지 마요.'], `
A*|熊猫呢？|판다는요?|xióngmāo ne?
B|他正在睡觉呢。|지금 자고 있어요.|tā zhèngzài shuìjiào ne.
A|考拉在做什么？|코알라는 뭐 하고 있어요?|kǎolā zài zuò shénme?
B|考拉也在睡觉。别打扰他们。|코알라도 자고 있어요. 방해하지 마요.|kǎolā yě zài shuìjiào. bié dǎrǎo tāmen.
A|好，我们小声点儿。|네, 우리 조용히 해요.|hǎo, wǒmen xiǎo shēng diǎnr.`),
    Z('11과 · 来我家玩儿', '<p>초대: <b>来我家玩儿吧</b>(우리 집에 놀러 와). 부탁할 때는 <b>请</b> + 동사.</p><p>무엇을 가져갈지 물을 때 <b>要带什么？</b></p>', ['欢迎欢迎！', '어서 와요, 환영해요!'], `
A*|星期六来我家玩儿吧！|토요일에 우리 집에 놀러 와!|xīngqīliù lái wǒ jiā wánr ba!
B|好啊！要带什么？|좋아! 뭐 가져갈까?|hǎo a! yào dài shénme?
A|带点儿水果吧。|과일 좀 가져와.|dài diǎnr shuǐguǒ ba.
B|没问题。几点去？|문제없어. 몇 시에 갈까?|méi wèntí. jǐ diǎn qù?
A|下午两点。欢迎欢迎！|오후 두 시. 환영해!|xiàwǔ liǎng diǎn. huānyíng huānyíng!`),
    Z('12과 · 你什么时候来的', '<p>완료·과거: 동사 + <b>了</b>(했다). 부정은 <b>没</b> + 동사(了는 빼요).</p><p>지난 일의 때·방법을 강조할 때 <b>是…的</b>: 你是什么时候来的？</p>', ['还没呢。', '아직이요.'], `
A*|你是什么时候来村子的？|마을에 언제 왔어요?|nǐ shì shénme shíhou lái cūnzi de?
B|我是上个月来的。|지난달에 왔어요.|wǒ shì shàng ge yuè lái de.
A|你去海边了吗？|바닷가에 가 봤어요?|nǐ qù hǎibiān le ma?
B|还没呢。|아직이요.|hái méi ne.
A|那明天一起去吧。|그럼 내일 같이 가요.|nà míngtiān yìqǐ qù ba.`)
  ] });

  window.LANGS.zh.units.push({ title: '첫걸음 회화 2 (13~24과)', level: 'CO', stages: [
    Z('13과 · 我喜欢看书', '<p><b>喜欢</b> + 동사 = ~하는 걸 좋아해요. 취미는 <b>爱好</b>.</p>', ['我们一样！', '우리 똑같네요!'], `
A*|你的爱好是什么？|취미가 뭐예요?|nǐ de àihào shì shénme?
B|我喜欢看书。|책 읽는 걸 좋아해요.|wǒ xǐhuan kàn shū.
A|你喜欢看什么书？|어떤 책을 좋아해요?|nǐ xǐhuan kàn shénme shū?
B|我喜欢看小说。|소설을 좋아해요.|wǒ xǐhuan kàn xiǎoshuō.
A*|我也喜欢看小说！|저도 소설 좋아해요!|wǒ yě xǐhuan kàn xiǎoshuō!
B|我们一样！|우리 똑같네요!|wǒmen yíyàng!`),
    Z('14과 · 可以拍照吗', '<p>허락: <b>可以</b> + 동사 + 吗? = ~해도 돼요? 안 되면 <b>不可以</b> / <b>不行</b>.</p>', ['不好意思。', '죄송해요(쑥스러운 사과).'], `
B*|这儿可以拍照吗？|여기서 사진 찍어도 돼요?|zhèr kěyǐ pāizhào ma?
A|可以。|돼요.|kěyǐ.
B*|可以摸这朵花吗？|이 꽃 만져도 돼요?|kěyǐ mō zhè duǒ huā ma?
A|不好意思，不可以。|죄송해요, 안 돼요.|bù hǎoyìsi, bù kěyǐ.
B|好的，明白了。|네, 알겠어요.|hǎo de, míngbai le.`),
    Z('15과 · 往右拐', '<p>길 안내: <b>一直走</b> 쭉 가다, <b>往右拐</b> 오른쪽으로 돌다, <b>第二个路口</b> 두 번째 사거리.</p>', ['离这儿远吗？', '여기서 멀어요?'], `
B*|请问，邮局怎么走？|실례지만, 우체국은 어떻게 가요?|qǐngwèn, yóujú zěnme zǒu?
A|一直走，在第二个路口往右拐。|쭉 가서 두 번째 사거리에서 오른쪽으로 도세요.|yìzhí zǒu, zài dì èr ge lùkǒu wǎng yòu guǎi.
B|离这儿远吗？|여기서 멀어요?|lí zhèr yuǎn ma?
A|不远，走路五分钟。|안 멀어요, 걸어서 5분이에요.|bù yuǎn, zǒulù wǔ fēnzhōng.
B|太谢谢你了！|정말 고마워요!|tài xièxie nǐ le!`),
    Z('16과 · 我想喝茶', '<p>바람: <b>想</b> + 동사 = ~하고 싶어요. 주문은 <b>要</b> + 물건 / <b>来</b> + 수량.</p>', ['来一杯…', '~한 잔 주세요'], `
A|你想喝什么？|뭐 마시고 싶어요?|nǐ xiǎng hē shénme?
B|我想喝热茶。|따뜻한 차 마시고 싶어요.|wǒ xiǎng hē rè chá.
A|服务员，来两杯热茶。|여기요, 따뜻한 차 두 잔 주세요.|fúwùyuán, lái liǎng bēi rè chá.
A*|你饿不饿？|배고프지 않아요?|nǐ è bu è?
B|有点儿饿。我想吃包子。|조금 고파요. 만두 먹고 싶어요.|yǒudiǎnr è. wǒ xiǎng chī bāozi.`),
    Z('17과 · 我迷路了', '<p>상태가 바뀌었을 때 문장 끝 <b>了</b>: 我迷路了(길을 잃었어요), 下雨了(비가 와요).</p>', ['帮帮我！', '좀 도와주세요!'], `
B*|不好意思，我迷路了。|죄송해요, 길을 잃었어요.|bù hǎoyìsi, wǒ mílù le.
A|你要去哪儿？|어디 가요?|nǐ yào qù nǎr?
B|我要去公园。|공원에 가요.|wǒ yào qù gōngyuán.
A|很近，我带你去吧。|가까워요, 제가 데려다줄게요.|hěn jìn, wǒ dài nǐ qù ba.
B|太好了！|정말 잘됐다!|tài hǎo le!`),
    Z('18과 · 旅行怎么样', '<p>어땠는지 물을 때 <b>怎么样？</b> 정도 보어: 동사 + <b>得</b> + 형용사 = ~하게 ~했다. 玩儿得很开心.</p>', ['真可惜！', '정말 아쉽다!'], `
A*|旅行怎么样？|여행 어땠어요?|lǚxíng zěnmeyàng?
B|玩儿得很开心！|정말 즐겁게 놀았어요!|wánr de hěn kāixīn!
A|天气好吗？|날씨는 좋았어요?|tiānqì hǎo ma?
B|不太好，一直下雨。|별로요, 계속 비가 왔어요.|bú tài hǎo, yìzhí xià yǔ.
A|真可惜！|정말 아쉽네요!|zhēn kěxī!`),
    Z('19과 · 你去过吗', '<p>경험: 동사 + <b>过</b> = ~한 적 있다. 부정은 <b>没</b> + 동사 + 过.</p>', ['真厉害！', '정말 대단하다!'], `
A*|你去过北京吗？|베이징에 가 본 적 있어요?|nǐ qù guo Běijīng ma?
B|没去过。你呢？|가 본 적 없어요. 당신은요?|méi qù guo. nǐ ne?
A|我去过两次。|두 번 가 봤어요.|wǒ qù guo liǎng cì.
B|真厉害！你吃过烤鸭吗？|대단해요! 오리구이 먹어 봤어요?|zhēn lìhai! nǐ chī guo kǎoyā ma?
A|吃过，特别好吃。|먹어 봤어요, 정말 맛있어요.|chī guo, tèbié hǎochī.`),
    Z('20과 · 比较', '<p>비교: <b>A 比 B</b> + 형용사 = A가 B보다 ~하다. 같으면 <b>A 和 B 一样</b>.</p>', ['都可以。', '다 괜찮아요.'], `
A*|夏天和冬天，你喜欢哪个？|여름이랑 겨울 중에 뭐가 좋아요?|xiàtiān hé dōngtiān, nǐ xǐhuan nǎge?
B|我喜欢冬天。|겨울이 좋아요.|wǒ xǐhuan dōngtiān.
A|为什么？|왜요?|wèi shénme?
B|冬天比夏天凉快。|겨울이 여름보다 시원하니까요.|dōngtiān bǐ xiàtiān liángkuai.
A*|山和海呢？|산이랑 바다는요?|shān hé hǎi ne?
B|都可以。|다 좋아요.|dōu kěyǐ.`),
    Z('21과 · 会游泳吗', '<p><b>会</b> = (배워서) 할 줄 안다, <b>能</b> = (상황상) 할 수 있다.</p>', ['一点儿也不会。', '하나도 못해요.'], `
A*|你会游泳吗？|수영할 줄 알아요?|nǐ huì yóuyǒng ma?
B|一点儿也不会。|하나도 못해요.|yìdiǎnr yě bú huì.
A|水獭会游泳，他能教你。|수달은 수영할 줄 알아요, 가르쳐 줄 수 있어요.|shuǐtǎ huì yóuyǒng, tā néng jiāo nǐ.
B|真的吗？他星期六能来吗？|정말요? 토요일에 올 수 있을까요?|zhēn de ma? tā xīngqīliù néng lái ma?
A|我问问他。|제가 물어볼게요.|wǒ wènwen tā.`),
    Z('22과 · 头疼', '<p>아플 때: 아픈 곳 + <b>疼</b>. 충고는 <b>应该</b> + 동사(~해야 해요), <b>最好</b>(~하는 게 제일 좋아요).</p>', ['多喝水。', '물 많이 마셔요.'], `
A|你怎么了？|어디 아파요?|nǐ zěnme le?
B|我头疼，还有点儿发烧。|머리가 아프고 열도 좀 나요.|wǒ tóu téng, hái yǒudiǎnr fāshāo.
A|你应该去医院。|병원에 가야 해요.|nǐ yīnggāi qù yīyuàn.
B|好，我下午去。|네, 오후에 갈게요.|hǎo, wǒ xiàwǔ qù.
A*|多喝水，早点儿睡觉。|물 많이 마시고 일찍 자요.|duō hē shuǐ, zǎo diǎnr shuìjiào.
B|谢谢你的关心。|걱정해 줘서 고마워요.|xièxie nǐ de guānxīn.`),
    Z('23과 · 生日快乐', '<p>축하: <b>生日快乐！</b> 선물은 <b>送</b>(주다). 마음에 들면 <b>我很喜欢</b>.</p>', ['祝你天天开心！', '매일 즐겁길 바라요!'], `
A*|生日快乐！这是送你的礼物。|생일 축하해! 이거 선물이야.|shēngrì kuàilè! zhè shì sòng nǐ de lǐwù.
B|谢谢！我可以打开吗？|고마워! 열어 봐도 돼?|xièxie! wǒ kěyǐ dǎkāi ma?
A|当然可以。|당연하지.|dāngrán kěyǐ.
B|哇，好漂亮的杯子！我很喜欢。|와, 정말 예쁜 컵이다! 정말 마음에 들어.|wā, hǎo piàoliang de bēizi! wǒ hěn xǐhuan.
A|祝你天天开心！|매일 즐겁길 바라!|zhù nǐ tiāntiān kāixīn!`),
    Z('24과 · 再见', '<p>작별: <b>一路平安</b>(가는 길 평안하길), <b>保持联系</b>(연락하고 지내요). <b>多亏了</b> ~ = ~ 덕분에.</p>', ['后会有期！', '또 만날 날이 있을 거예요!'], `
B*|我下个星期回国。|다음 주에 귀국해요.|wǒ xià ge xīngqī huí guó.
A|真舍不得你。|정말 보내기 아쉬워요.|zhēn shěbude nǐ.
B|多亏了大家，我每天都很开心。|여러분 덕분에 매일 즐거웠어요.|duōkuī le dàjiā, wǒ měitiān dōu hěn kāixīn.
A|我们保持联系吧。|우리 연락하고 지내요.|wǒmen bǎochí liánxì ba.
B|好！后会有期！|좋아요! 또 만나요!|hǎo! hòu huì yǒu qī!
A|一路平安！|조심히 가요!|yí lù píng'ān!`)
  ] });
})();
