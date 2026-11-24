// 문법 단원 (말씨정원). 국내 입문 교재들이 공통으로 다루는 순서를 따라 직접 썼다.
// xf 한 줄: 문제(바꾸기 전 → 바꿀 형태)|정답|오답,오답,오답|뜻
(function () {
  function G(title, rule, xf, sents) { return { title: title, rule: rule, xf: xf, sents: sents }; }

  window.LANGS.ja.units.push({ title: '문법 · 기본 문장', level: 'GR', stages: [
    G('명사 + です', '<p><b>A は B です</b> = A는 B입니다. 아니라고 할 때는 <b>ではありません</b>(편하게 じゃありません).</p><p>물을 때는 끝에 <b>か</b>를 붙여요: ～ですか。</p>', `
学生 → 정중하게 (~입니다)|学生です|学生ます,学生でした,学生だ|학생입니다
学生 → 부정 (~이 아닙니다)|学生ではありません|学生ないです,学生ません,学生でした|학생이 아닙니다
先生 → 질문 (~입니까?)|先生ですか|先生か,先生ますか,先生でか|선생님입니까?
会社員 → 정중하게|会社員です|会社員ます,会社員ない,会社員だか|회사원입니다
日本人 → 부정|日本人ではありません|日本人ません,日本人ないです,日本人でした|일본인이 아닙니다
韓国人 → 정중하게|韓国人です|韓国人ます,韓国人でか,韓国人ない|한국인입니다`, `
わたし=나/は=~은/学生=학생/です=~입니다|저는 학생입니다
これ=이것/は=~은/ペン=펜/では ありません=~이 아닙니다|이것은 펜이 아닙니다`),
    G('조사 は・が・を・に・で', '<table><tr><th>조사</th><th>뜻</th><th>예</th></tr><tr><td>は (와)</td><td>~은/는 (주제)</td><td>わたしは</td></tr><tr><td>が</td><td>~이/가</td><td>ねこがいます</td></tr><tr><td>を (오)</td><td>~을/를</td><td>パンをたべます</td></tr><tr><td>に</td><td>~에 (시간·장소·목적지)</td><td>がっこうにいきます</td></tr><tr><td>で</td><td>~에서 (하는 곳)·~으로 (수단)</td><td>いえでたべます</td></tr></table>', `
パン ( ) 食べます → 을/를|パンを食べます|パンが食べます,パンに食べます,パンで食べます|빵을 먹습니다
学校 ( ) 行きます → 에 (가다)|学校に行きます|学校を行きます,学校で行きます,学校が行きます|학교에 갑니다
家 ( ) 食べます → 에서|家で食べます|家に食べます,家を食べます,家が食べます|집에서 먹습니다
ねこ ( ) います → 이/가|ねこがいます|ねこをいます,ねこでいます,ねこにいます|고양이가 있습니다
わたし ( ) キムです → 은/는|わたしはキムです|わたしをキムです,わたしでキムです,わたしにキムです|저는 김입니다
バス ( ) 行きます → 으로 (수단)|バスで行きます|バスを行きます,バスが行きます,バスは行きます|버스로 갑니다`, `
わたし=나/は=~은/パン=빵/を=~을/食べます=먹습니다|저는 빵을 먹습니다
バス=버스/で=~으로/学校=학교/に=~에/行きます=갑니다|버스로 학교에 갑니다`),
    G('동사 ます형', '<p>동사를 정중하게 말할 때 <b>ます</b>를 붙여요. 부정은 <b>ません</b>.</p><table><tr><th>그룹</th><th>사전형</th><th>ます형</th></tr><tr><td>1그룹 (う단 → い단)</td><td>のむ</td><td>のみます</td></tr><tr><td>2그룹 (る를 빼고)</td><td>たべる</td><td>たべます</td></tr><tr><td>3그룹 (불규칙)</td><td>する / くる</td><td>します / きます</td></tr></table>', `
飲む → ます형|飲みます|飲むます,飲めます,飲まます|마십니다
食べる → ます형|食べます|食べります,食べるます,食べいます|먹습니다
行く → ます형|行きます|行くます,行けます,行かます|갑니다
する → ます형|します|するます,さます,すます|합니다
来る → ます형|来ます|来るます,来ります,来います|옵니다
見る → 부정 (~하지 않습니다)|見ません|見ないです,見りません,見まない|보지 않습니다`, `
毎朝=매일 아침/コーヒー=커피/を=~을/飲みます=마십니다|매일 아침 커피를 마십니다
テレビ=텔레비전/を=~을/見ません=보지 않습니다|텔레비전을 보지 않아요`),
    G('과거 ました', '<p>ます → <b>ました</b> (했습니다), ません → <b>ませんでした</b> (하지 않았습니다).</p><p>명사는 です → <b>でした</b>.</p>', `
食べます → 과거|食べました|食べますた,食べでした,食べたです|먹었습니다
行きます → 과거|行きました|行きましだ,行きでした,行ったます|갔습니다
飲みません → 과거|飲みませんでした|飲みませんた,飲みましんでした,飲みないでした|마시지 않았습니다
します → 과거|しました|しますた,したます,しでした|했습니다
学生です → 과거|学生でした|学生ました,学生だった です,学生ですた|학생이었습니다
見ます → 과거|見ました|見ますた,見たます,見でした|봤습니다`, `
きのう=어제/すし=초밥/を=~을/食べました=먹었습니다|어제 초밥을 먹었어요
きのう=어제/は=~은/休み=휴일/でした=~이었습니다|어제는 쉬는 날이었어요`),
    G('い형용사', '<p>い로 끝나는 형용사. 부정은 い → <b>くない</b>, 과거는 い → <b>かった</b>.</p><p>예외: いい → よくない / よかった</p>', `
おいしい → 부정|おいしくないです|おいしいではありません,おいしないです,おいしくありです|맛있지 않습니다
おいしい → 과거|おいしかったです|おいしいでした,おいしでした,おいしくたです|맛있었습니다
高い → 부정|高くないです|高いではありません,高ないです,高かったです|비싸지 않습니다
寒い → 과거|寒かったです|寒いでした,寒でした,寒くないです|추웠습니다
いい → 부정|よくないです|いくないです,いいくないです,いいではありません|좋지 않습니다
いい → 과거|よかったです|いかったです,いいでした,いいかったです|좋았습니다`, `
この=이/ラーメン=라멘/は=~은/おいしかったです=맛있었습니다|이 라멘은 맛있었어요
今日=오늘/は=~은/寒くないです=춥지 않습니다|오늘은 춥지 않아요`),
    G('な형용사', '<p>静か, きれい, 好き 같은 な형용사는 명사처럼 활용해요.</p><table><tr><td>현재</td><td>静かです</td></tr><tr><td>부정</td><td>静かではありません</td></tr><tr><td>과거</td><td>静かでした</td></tr><tr><td>명사 꾸밀 때</td><td>静か<b>な</b>へや</td></tr></table>', `
静か → 정중하게|静かです|静かいです,静かなです,静かだです|조용합니다
静か → 부정|静かではありません|静かくないです,静かないです,静かじゃないでした|조용하지 않습니다
きれい → 과거|きれいでした|きれかったです,きれいかったです,きれいました|예뻤습니다
好き → 정중하게|好きです|好きいです,好きなです,好きます|좋아합니다
静か + へや → 꾸미기|静かなへや|静かへや,静かいへや,静かのへや|조용한 방
きれい + 花 → 꾸미기|きれいな花|きれい花,きれいい花,きれいの花|예쁜 꽃`, `
この=이/へや=방/は=~은/静かです=조용합니다|이 방은 조용해요
きれいな=예쁜/花=꽃/です=~입니다/ね=~네요|예쁜 꽃이네요`),
    G('て형 만들기', '<table><tr><th>끝 글자</th><th>て형</th><th>예</th></tr><tr><td>う・つ・る</td><td>って</td><td>かう→かって</td></tr><tr><td>む・ぶ・ぬ</td><td>んで</td><td>のむ→のんで</td></tr><tr><td>く / ぐ</td><td>いて / いで</td><td>かく→かいて</td></tr><tr><td>す</td><td>して</td><td>はなす→はなして</td></tr><tr><td>2그룹</td><td>る→て</td><td>たべる→たべて</td></tr></table><p>예외: 行く→<b>行って</b>, する→して, 来る→来て</p>', `
買う → て형|買って|買いて,買んで,買うて|사서
飲む → て형|飲んで|飲みて,飲って,飲いて|마시고
書く → て형|書いて|書きて,書って,書んで|쓰고
話す → て형|話して|話いて,話って,話んで|이야기하고
食べる → て형|食べて|食べって,食べりて,食べんで|먹고
行く → て형 (예외)|行って|行いて,行きて,行んで|가서`, `
パン=빵/を=~을/買って=사서/食べます=먹습니다|빵을 사서 먹어요
手紙=편지/を=~을/書いて=써서/送ります=보냅니다|편지를 써서 보내요`),
    G('～てください・～ています', '<p><b>て형 + ください</b> = ~해 주세요</p><p><b>て형 + います</b> = ~하고 있습니다 (진행·상태)</p>', `
待つ → ~해 주세요|待ってください|待ちてください,待つください,待んでください|기다려 주세요
見る → ~해 주세요|見てください|見るください,見ってください,見んでください|봐 주세요
読む → ~하고 있습니다|読んでいます|読みています,読っています,読いています|읽고 있습니다
働く → ~하고 있습니다|働いています|働きています,働っています,働んでいます|일하고 있습니다
座る → ~해 주세요|座ってください|座りてください,座んでください,座るてください|앉아 주세요
住む → ~하고 있습니다|住んでいます|住みています,住っています,住いています|살고 있습니다`, `
ここ=여기/で=~에서/待ってください=기다려 주세요|여기서 기다려 주세요
いま=지금/本=책/を=~을/読んでいます=읽고 있습니다|지금 책을 읽고 있어요`),
    G('ない형 (~하지 않다)', '<p>편하게 "안 해"라고 할 때 쓰는 형태예요.</p><table><tr><td>1그룹</td><td>う단 → あ단 + ない</td><td>のむ→のまない</td></tr><tr><td>2그룹</td><td>る → ない</td><td>たべる→たべない</td></tr><tr><td>3그룹</td><td>しない / こない</td><td></td></tr></table><p>う로 끝나면 わ: かう→<b>かわない</b></p><p><b>ないでください</b> = ~하지 마세요</p>', `
飲む → ない형|飲まない|飲みない,飲めない,飲むない|마시지 않다
食べる → ない형|食べない|食べらない,食べるない,食べまない|먹지 않다
買う → ない형|買わない|買あない,買いない,買うない|사지 않다
する → ない형|しない|すない,さない,するない|하지 않다
来る → ない형|来ない|来らない,来るない,来りない|오지 않다
行く → ~하지 마세요|行かないでください|行きないでください,行くないでください,行かないください|가지 마세요`, `
きょう=오늘/は=~은/お酒=술/を=~을/飲まない=마시지 않는다|오늘은 술을 안 마셔
ここ=여기/で=~에서/写真=사진/を=~을/撮らないでください=찍지 마세요|여기서 사진 찍지 마세요`),
    G('た형·～たことがあります', '<p>た형은 て형의 て를 <b>た</b>로 바꾸면 돼요 (편한 과거).</p><p><b>た형 + ことがあります</b> = ~한 적이 있습니다</p>', `
食べる → た형|食べた|食べって,食べいた,食べるた|먹었다
飲む → た형|飲んだ|飲みた,飲った,飲いた|마셨다
行く → た형|行った|行いた,行きた,行んだ|갔다
書く → た형|書いた|書きた,書った,書んだ|썼다
行く → ~한 적이 있습니다|行ったことがあります|行くことがあります,行きたことがあります,行ってことがあります|간 적이 있습니다
食べる → ~한 적이 있습니다|食べたことがあります|食べることがあります,食べてことがあります,食べましたことがあります|먹은 적이 있습니다`, `
日本=일본/に=~에/行ったことがあります=간 적이 있습니다|일본에 간 적이 있어요
きのう=어제/映画=영화/を=~을/見た=봤다|어제 영화를 봤어
`),
    G('～たい (하고 싶다)', '<p><b>ます형에서 ます를 빼고 たい</b> = ~하고 싶다. い형용사처럼 활용해요 (たくない, たかった).</p>', `
食べます → ~하고 싶다|食べたいです|食べますたい,食べるたい,食べてたい|먹고 싶습니다
行きます → ~하고 싶다|行きたいです|行くたいです,行ったいです,行かたいです|가고 싶습니다
飲みます → ~하고 싶지 않다|飲みたくないです|飲みたいないです,飲みたいではありません,飲まないたいです|마시고 싶지 않습니다
見ます → ~하고 싶다|見たいです|見るたいです,見てたいです,見ますたい|보고 싶습니다
休みます → ~하고 싶다|休みたいです|休むたいです,休んたいです,休まないです|쉬고 싶습니다
会います → ~하고 싶었다|会いたかったです|会いたいでした,会うたかったです,会いたくでした|만나고 싶었습니다`, `
日本=일본/に=~에/行きたいです=가고 싶습니다|일본에 가고 싶어요
ラーメン=라멘/が=~이/食べたいです=먹고 싶습니다|라멘이 먹고 싶어요`),
    G('～ことができます (할 수 있다)', '<p><b>사전형 + ことができます</b> = ~할 수 있습니다. 명사는 <b>명사 + ができます</b> (日本語ができます).</p>', `
泳ぐ → ~할 수 있다|泳ぐことができます|泳ぎことができます,泳いでことができます,泳ぐができます|헤엄칠 수 있습니다
話す → ~할 수 있다|話すことができます|話しことができます,話してことができます,話すができます|말할 수 있습니다
読む → ~할 수 있다|読むことができます|読みことができます,読んでことができます,読むをできます|읽을 수 있습니다
日本語 → ~을 할 수 있다|日本語ができます|日本語をできます,日本語にできます,日本語でできます|일본어를 할 수 있습니다
料理 → ~을 할 수 있다|料理ができます|料理をできます,料理にできます,料理はできます|요리를 할 수 있습니다
書く → ~할 수 있다|書くことができます|書きことができます,書いてことができます,書くができます|쓸 수 있습니다`, `
わたし=나/は=~은/日本語=일본어/が=~을/できます=할 수 있습니다|저는 일본어를 할 수 있어요
漢字=한자/を=~을/読むことができます=읽을 수 있습니다|한자를 읽을 수 있어요`)
  ] });

  window.LANGS.zh.units.push({ title: '문법 · 기본 문장', level: 'GR', stages: [
    G('是 (~이다)', '<p><b>A 是 B</b> = A는 B이다. 아니라고 할 때는 <b>不是</b>.</p><p>중국어 동사는 사람이나 시간에 따라 모양이 바뀌지 않아요.</p>', `
我 ( ) 学生 → ~이다|我是学生|我在学生,我有学生,我很学生|나는 학생이다
他 ( ) 老师 → ~가 아니다|他不是老师|他没是老师,他是不老师,他不有老师|그는 선생님이 아니다
她 ( ) 中国人 → ~이다|她是中国人|她有中国人,她在中国人,她很中国人|그녀는 중국인이다
我 ( ) 韩国人 → ~이다|我是韩国人|我很韩国人,我在韩国人,我有韩国人|나는 한국인이다
这 ( ) 书 → ~가 아니다|这不是书|这没是书,这是没书,这不书|이것은 책이 아니다
那 ( ) 我的 → ~이다|那是我的|那有我的,那在我的,那很我的|저것은 내 것이다`, `
我=wǒ 나/是=shì ~이다/韩国人=Hánguórén 한국 사람|저는 한국 사람이에요
他=tā 그/不=bù 아니/是=shì ~이다/老师=lǎoshī 선생님|그는 선생님이 아니에요`),
    G('吗 의문문', '<p>평서문 끝에 <b>吗</b>만 붙이면 "~입니까?"가 돼요.</p><p>什么(무엇)·谁(누구)·哪儿(어디) 같은 물음말이 있으면 吗를 붙이지 않아요.</p>', `
你是学生 → 질문으로|你是学生吗|你吗是学生,吗你是学生,你是吗学生|너는 학생이니?
你好 → 질문으로|你好吗|你吗好,吗你好,你好呢吗|잘 지내?
他是谁 → 바른 문장|他是谁|他是谁吗,他吗是谁,谁他是吗|그는 누구야?
你喝茶 → 질문으로|你喝茶吗|你吗喝茶,你喝吗茶,吗你喝茶|차 마실래?
这是什么 → 바른 문장|这是什么|这是什么吗,这吗是什么,什么这是吗|이것은 뭐야?
你去 → 질문으로|你去吗|你吗去,吗你去,去你吗|너 갈래?`, `
你=nǐ 너/是=shì ~이다/学生=xuésheng 학생/吗=ma ~까|당신은 학생이에요?
这=zhè 이것/是=shì ~이다/什么=shénme 무엇|이것은 뭐예요?`),
    G('有·没有 (있다·없다)', '<p><b>有</b> = 있다·가지고 있다. 부정은 <b>没有</b> (不有는 쓰지 않아요).</p>', `
我 ( ) 哥哥 → 있다|我有哥哥|我是哥哥,我在哥哥,我很哥哥|나는 형(오빠)이 있다
我 ( ) 钱 → 없다|我没有钱|我不有钱,我不是钱,我有没钱|나는 돈이 없다
他 ( ) 车 → 있다|他有车|他是车,他在车,他很车|그는 차가 있다
今天 ( ) 课 → 없다|今天没有课|今天不有课,今天不是课,今天有不课|오늘은 수업이 없다
你 ( ) 时间吗 → 있다|你有时间吗|你是时间吗,你在时间吗,你很时间吗|시간 있어?
家里 ( ) 猫 → 없다|家里没有猫|家里不有猫,家里没是猫,家里不在猫|집에 고양이가 없다`, `
我=wǒ 나/有=yǒu 있다/一个=yí ge 한 명/哥哥=gēge 오빠|저는 오빠가 한 명 있어요
今天=jīntiān 오늘/没有=méiyǒu 없다/课=kè 수업|오늘은 수업이 없어요`),
    G('很 + 형용사', '<p>형용사 문장에는 是를 쓰지 않고 <b>很</b>을 붙여요: 我很好 (나는 잘 지낸다).</p><p>부정은 <b>不</b> + 형용사: 不忙.</p>', `
我 ( ) 好 → 형용사 문장|我很好|我是好,我有好,我在好|나는 잘 지낸다
他 ( ) 忙 → 부정|他不忙|他没忙,他不是忙,他很不是忙|그는 바쁘지 않다
今天 ( ) 冷 → 형용사 문장|今天很冷|今天是冷,今天有冷,今天在冷|오늘은 춥다
汉语 ( ) 难 → 부정|汉语不难|汉语没难,汉语不是难,汉语没有难|중국어는 어렵지 않다
这个 ( ) 贵 → 형용사 문장|这个很贵|这个是贵,这个有贵,这个在贵|이것은 비싸다
她 ( ) 漂亮 → 형용사 문장|她很漂亮|她是漂亮,她有漂亮,她在漂亮|그녀는 예쁘다`, `
我=wǒ 나/很=hěn 아주/好=hǎo 좋다|저는 잘 지내요
汉语=Hànyǔ 중국어/不=bù 안/难=nán 어렵다|중국어는 어렵지 않아요`),
    G('的 (~의)', '<p><b>A 的 B</b> = A의 B. 가족·친한 사이는 的를 빼기도 해요: 我妈妈.</p>', `
我 + 书 → 나의 책|我的书|的我书,我书的,书的我|나의 책
老师 + 名字 → 선생님의 이름|老师的名字|的老师名字,名字的老师,老师名字的|선생님의 이름
他 + 手机 → 그의 휴대폰|他的手机|手机的他,的他手机,他手机的|그의 휴대폰
这是 + 我 → 이것은 내 것이다|这是我的|这是的我,这的是我,这我的是|이것은 내 것이다
妈妈 + 包 → 엄마의 가방|妈妈的包|包的妈妈,的妈妈包,妈妈包的|엄마의 가방
朋友 + 家 → 친구의 집|朋友的家|家的朋友,的朋友家,朋友家的|친구의 집`, `
这=zhè 이것/是=shì ~이다/我的=wǒ de 나의/书=shū 책|이건 제 책이에요
老师的=lǎoshī de 선생님의/名字=míngzi 이름/是=shì ~이다/什么=shénme 무엇|선생님 이름이 뭐예요?`),
    G('在 (~에 있다·~에서)', '<p><b>A 在 장소</b> = A는 ~에 있다.</p><p><b>在 장소 + 동사</b> = ~에서 ~하다: 我在家吃饭.</p>', `
我 ( ) 家 → ~에 있다|我在家|我是家,我有家,我很家|나는 집에 있다
书 ( ) 桌子上 → ~에 있다|书在桌子上|书是桌子上,书很桌子上,书的桌子上|책은 책상 위에 있다
我 ( ) 家吃饭 → ~에서|我在家吃饭|我吃饭在家,在我家吃饭,我家在吃饭|나는 집에서 밥을 먹는다
他 ( ) 学校 → ~에 없다|他不在学校|他没是学校,他不是学校,他在不学校|그는 학교에 없다
你 ( ) 哪儿 → ~에 있다|你在哪儿|你是哪儿,你有哪儿,你哪儿在|너 어디에 있어?
我 ( ) 公司工作 → ~에서|我在公司工作|我工作在公司,在公司我工作,我公司在工作|나는 회사에서 일한다`, `
我=wǒ 나/在=zài ~에서/家=jiā 집/吃饭=chīfàn 밥 먹다|저는 집에서 밥을 먹어요
你=nǐ 너/在=zài ~에 있다/哪儿=nǎr 어디|어디에 있어요?`),
    G('了 (완료·변화)', '<p>동사 뒤나 문장 끝의 <b>了</b> = ~했다 (완료) / ~하게 됐다 (변화).</p><p>안 했다는 <b>没</b> + 동사 (了는 빼요): 我没吃.</p>', `
我吃饭 → 완료|我吃饭了|我了吃饭,了我吃饭,我吃了了饭|나는 밥을 먹었다
我吃饭 → 안 했다|我没吃饭|我不吃饭了,我没吃饭了,我吃没饭|나는 밥을 안 먹었다
他来 → 완료|他来了|他了来,了他来,他来过了了|그가 왔다
天冷 → 변화|天冷了|天了冷,了天冷,天冷冷了|날이 추워졌다
我买书 → 완료|我买书了|我了买书,我书买了了,了我买书|나는 책을 샀다
她去 → 안 했다|她没去|她不去了,她没去了,她去没|그녀는 안 갔다`, `
我=wǒ 나/吃=chī 먹다/饭=fàn 밥/了=le (완료)|저 밥 먹었어요
我=wǒ 나/没=méi 안 (과거)/去=qù 가다|저는 안 갔어요`),
    G('过 (~한 적 있다)', '<p><b>동사 + 过</b> = ~한 적이 있다. 부정은 <b>没 + 동사 + 过</b>.</p>', `
我去中国 → 경험|我去过中国|我过去中国,我去中国过,过我去中国|나는 중국에 가 본 적 있다
我吃北京烤鸭 → 경험|我吃过北京烤鸭|我过吃北京烤鸭,我吃北京烤鸭过,过我吃北京烤鸭|나는 베이징 오리구이를 먹어 본 적 있다
我看这本书 → 경험 없음|我没看过这本书|我不看过这本书,我没过看这本书,我看没过这本书|나는 이 책을 본 적 없다
你学汉语吗 → 경험 질문|你学过汉语吗|你过学汉语吗,你学汉语过吗,过你学汉语吗|중국어 배워 본 적 있어?
他来韩国 → 경험|他来过韩国|他过来韩国,他来韩国过,过他来韩国|그는 한국에 와 본 적 있다
我见他 → 경험 없음|我没见过他|我不见过他,我没过见他,我见没过他|나는 그를 본 적 없다`, `
我=wǒ 나/去过=qùguo 가 본 적 있다/中国=Zhōngguó 중국|저는 중국에 가 봤어요
我=wǒ 나/没=méi 안/看过=kànguo 본 적 있다/这本书=zhè běn shū 이 책|이 책은 안 읽어 봤어요`),
    G('比 (비교)', '<p><b>A 比 B + 형용사</b> = A가 B보다 ~하다. 比 문장에는 很을 쓰지 않아요.</p><p>더 많이는 <b>형용사 + 多了</b>, 조금은 <b>형용사 + 一点儿</b>.</p>', `
我 / 他 / 高 → 내가 그보다 크다|我比他高|我他比高,比我他高,我比他很高|나는 그보다 키가 크다
今天 / 昨天 / 冷 → 오늘이 어제보다 춥다|今天比昨天冷|今天昨天比冷,比今天昨天冷,今天比昨天很冷|오늘은 어제보다 춥다
这个 / 那个 / 贵 → 이게 저것보다 비싸다|这个比那个贵|这个那个比贵,比这个那个贵,这个比那个很贵|이것은 저것보다 비싸다
汉语 / 英语 / 难 → 훨씬|汉语比英语难多了|汉语比英语多了难,汉语比英语很难多了,汉语多了比英语难|중국어가 영어보다 훨씬 어렵다
我 / 你 / 大 → 조금|我比你大一点儿|我比你一点儿大,我一点儿比你大,我比一点儿你大|나는 너보다 조금 나이가 많다
猫 / 狗 / 小 → 고양이가 개보다 작다|猫比狗小|猫狗比小,比猫狗小,猫比狗很小|고양이는 개보다 작다`, `
今天=jīntiān 오늘/比=bǐ ~보다/昨天=zuótiān 어제/冷=lěng 춥다|오늘은 어제보다 추워요
我=wǒ 나/比=bǐ ~보다/他=tā 그/高=gāo 크다|제가 그보다 키가 커요`),
    G('想·要 (하고 싶다·하려 하다)', '<p><b>想 + 동사</b> = ~하고 싶다 (바람). <b>要 + 동사</b> = ~하려 하다·~할 것이다 (의지).</p><p>"~하고 싶지 않다"는 <b>不想</b>.</p>', `
我 ( ) 去中国 → 하고 싶다|我想去中国|我去想中国,我想中国去,想我去中国|나는 중국에 가고 싶다
我 ( ) 吃饭 → 하고 싶지 않다|我不想吃饭|我想不吃饭,我没想吃饭,我不吃想饭|나는 밥을 먹고 싶지 않다
我 ( ) 买这个 → 하려 한다|我要买这个|我买要这个,要我买这个,我这个要买|나는 이걸 살 거다
你 ( ) 喝什么 → 하고 싶다|你想喝什么|你喝想什么,你想什么喝,想你喝什么|뭐 마시고 싶어?
他 ( ) 回家 → 하려 한다|他要回家|他回家要,他回要家,要他回家|그는 집에 가려고 한다
我 ( ) 休息 → 하고 싶다|我想休息|我休息想,想我休息,我想想休息|나는 쉬고 싶다`, `
我=wǒ 나/想=xiǎng ~하고 싶다/去=qù 가다/中国=Zhōngguó 중국|중국에 가고 싶어요
你=nǐ 너/想=xiǎng ~하고 싶다/喝=hē 마시다/什么=shénme 무엇|뭐 마시고 싶어요?`),
    G('会·能·可以 (할 수 있다)', '<table><tr><td><b>会</b></td><td>배워서 할 줄 안다</td><td>我会说汉语</td></tr><tr><td><b>能</b></td><td>능력·상황상 할 수 있다</td><td>我能去</td></tr><tr><td><b>可以</b></td><td>해도 된다 (허락)</td><td>可以进来吗</td></tr></table>', `
我 ( ) 说汉语 → 배워서 할 줄 안다|我会说汉语|我可以说汉语,我说会汉语,会我说汉语|나는 중국어를 할 줄 안다
我 ( ) 游泳 → 할 줄 모른다|我不会游泳|我会不游泳,我没会游泳,我不游泳会|나는 수영할 줄 모른다
我 ( ) 进来吗 → 해도 되나요|我可以进来吗|我会进来吗,我进来可以吗,可以我进来吗|들어가도 될까요?
明天我 ( ) 去 → 할 수 있다|明天我能去|明天我去能,能明天我去,明天能我去|내일 나는 갈 수 있다
这儿 ( ) 抽烟 → 하면 안 된다|这儿不可以抽烟|这儿可以不抽烟,这儿不会抽烟,这儿没可以抽烟|여기서 담배 피우면 안 된다
你 ( ) 开车吗 → 할 줄 아니|你会开车吗|你开车会吗,会你开车吗,你可以车开吗|운전할 줄 알아?`, `
我=wǒ 나/会=huì ~할 줄 알다/说=shuō 말하다/汉语=Hànyǔ 중국어|저는 중국어를 할 줄 알아요
我=wǒ 나/可以=kěyǐ ~해도 된다/进来=jìnlái 들어오다/吗=ma ~까|들어가도 될까요?`),
    G('양사 (个·本·杯…)', '<p>숫자와 명사 사이에 <b>양사</b>가 꼭 들어가요: 一<b>个</b>人, 两<b>本</b>书.</p><table><tr><td>个</td><td>사람·물건 (가장 흔함)</td></tr><tr><td>本</td><td>책</td></tr><tr><td>杯</td><td>잔</td></tr><tr><td>只</td><td>동물</td></tr><tr><td>件</td><td>옷·일</td></tr></table><p>2는 숫자로 셀 때 <b>两</b>: 两个人.</p>', `
一 + 人|一个人|一本人,一杯人,一只人|한 사람
两 + 书|两本书|两个书,两杯书,两只书|책 두 권
一 + 咖啡|一杯咖啡|一本咖啡,一只咖啡,一件咖啡|커피 한 잔
三 + 猫|三只猫|三本猫,三杯猫,三件猫|고양이 세 마리
一 + 衣服|一件衣服|一本衣服,一杯衣服,一只衣服|옷 한 벌
2 + 个人 → 숫자 2|两个人|二个人,俩个人,两人个|두 사람`, `
我=wǒ 나/要=yào 원하다/一杯=yì bēi 한 잔/咖啡=kāfēi 커피|커피 한 잔 주세요
我=wǒ 나/有=yǒu 있다/两本=liǎng běn 두 권/书=shū 책|저는 책이 두 권 있어요`)
  ] });

  window.LANGS.en.units.push({ title: '문법 · 기본 문장', level: 'GR', stages: [
    G('be동사 am · is · are', '<table><tr><td>I</td><td><b>am</b></td></tr><tr><td>you / we / they</td><td><b>are</b></td></tr><tr><td>he / she / it</td><td><b>is</b></td></tr></table><p>줄여서 I\'m, you\'re, he\'s 라고도 해요.</p>', `
I ___ a student|I am a student|I is a student,I are a student,I be a student|나는 학생이다
She ___ my sister|She is my sister|She am my sister,She are my sister,She be my sister|그녀는 내 여동생이다
They ___ happy|They are happy|They is happy,They am happy,They be happy|그들은 행복하다
It ___ cold today|It is cold today|It am cold today,It are cold today,It be cold today|오늘은 춥다
We ___ friends|We are friends|We is friends,We am friends,We be friends|우리는 친구다
He ___ tired|He is tired|He am tired,He are tired,He be tired|그는 피곤하다`, `
I=나/am=~이다/a=하나의/student=학생|저는 학생이에요
she=그녀/is=~이다/my=나의/sister=여동생|그녀는 제 여동생이에요`),
    G('be동사 부정·질문', '<p>부정: be동사 뒤에 <b>not</b> (isn\'t, aren\'t).</p><p>질문: be동사를 맨 앞으로: <b>Are you</b> ~? <b>Is he</b> ~?</p>', `
I am busy → 부정|I am not busy|I not am busy,I don't busy,I am no busy|나는 바쁘지 않다
He is a doctor → 부정|He is not a doctor|He not is a doctor,He don't a doctor,He is no a doctor|그는 의사가 아니다
You are hungry → 질문|Are you hungry?|You are hungry?,Do you hungry?,Is you hungry?|배고파?
She is at home → 질문|Is she at home?|Are she at home?,Does she at home?,She is at home?|그녀는 집에 있어?
They are students → 질문|Are they students?|Is they students?,Do they students?,They are students?|그들은 학생이야?
It is expensive → 부정|It is not expensive|It not is expensive,It don't expensive,It is no expensive|그것은 비싸지 않다`, `
are=~이니/you=너/hungry=배고픈|배고파요?
I=나/am=~이다/not=~ 아닌/busy=바쁜|저는 바쁘지 않아요`),
    G('a · an · 복수 -s', '<p>하나일 때 <b>a</b>, 모음 소리(a e i o u) 앞에서는 <b>an</b>: an apple.</p><p>여러 개면 끝에 <b>-s</b>: two cats. 불규칙: child → children, man → men.</p>', `
___ apple|an apple|a apple,the apples,an apples|사과 하나
___ banana|a banana|an banana,a bananas,an bananas|바나나 하나
two cat → 복수|two cats|two cat,two cates,two caties|고양이 두 마리
three child → 복수|three children|three childs,three childes,three child|아이 세 명
___ egg|an egg|a egg,an eggs,a eggs|달걀 하나
five book → 복수|five books|five book,five bookes,five bookies|책 다섯 권`, `
I=나/have=있다/an=하나의/apple=사과|사과가 하나 있어요
I=나/have=있다/two=둘/cats=고양이들|고양이가 두 마리 있어요`),
    G('일반동사와 3인칭 -s', '<p>he / she / it 이 주어일 때 동사 끝에 <b>-s</b>를 붙여요: She likes coffee.</p><p>-es: go → goes, watch → watches. have → <b>has</b>.</p>', `
She (like) coffee|She likes coffee|She like coffee,She liking coffee,She likees coffee|그녀는 커피를 좋아한다
He (go) to school|He goes to school|He go to school,He gos to school,He going to school|그는 학교에 간다
I (like) tea|I like tea|I likes tea,I liking tea,I likees tea|나는 차를 좋아한다
My mom (have) a car|My mom has a car|My mom have a car,My mom haves a car,My mom having a car|엄마는 차가 있다
He (watch) TV|He watches TV|He watch TV,He watchs TV,He watching TV|그는 TV를 본다
They (play) soccer|They play soccer|They plays soccer,They playing soccer,They playes soccer|그들은 축구를 한다`, `
she=그녀/likes=좋아한다/coffee=커피|그녀는 커피를 좋아해요
he=그/goes=간다/to=~에/school=학교|그는 학교에 가요`),
    G('do · does 부정·질문', '<p>일반동사 부정: <b>don\'t / doesn\'t + 동사원형</b>.</p><p>질문: <b>Do / Does + 주어 + 동사원형</b>? does 뒤에서는 -s를 빼요.</p>', `
I like fish → 부정|I don't like fish|I not like fish,I doesn't like fish,I don't likes fish|나는 생선을 안 좋아한다
She likes cats → 부정|She doesn't like cats|She don't like cats,She doesn't likes cats,She not likes cats|그녀는 고양이를 안 좋아한다
You like coffee → 질문|Do you like coffee?|Does you like coffee?,Are you like coffee?,Do you likes coffee?|커피 좋아해?
He plays tennis → 질문|Does he play tennis?|Do he play tennis?,Does he plays tennis?,Is he play tennis?|그는 테니스를 쳐?
They live here → 질문|Do they live here?|Does they live here?,Are they live here?,Do they lives here?|그들은 여기 살아?
He works on Sunday → 부정|He doesn't work on Sunday|He don't work on Sunday,He doesn't works on Sunday,He not works on Sunday|그는 일요일에 일하지 않는다`, `
do=~하니/you=너/like=좋아하다/coffee=커피|커피 좋아해요?
I=나/don't=~하지 않는다/like=좋아하다/fish=생선|저는 생선을 안 좋아해요`),
    G('현재진행 -ing', '<p><b>be동사 + 동사-ing</b> = ~하고 있다.</p><p>e로 끝나면 e를 빼고 -ing (make → making), 짧은 단어는 끝 글자를 겹쳐요 (run → running).</p>', `
I (eat) lunch now|I am eating lunch now|I eating lunch now,I am eat lunch now,I eat lunching now|나는 지금 점심을 먹고 있다
She (cook) dinner|She is cooking dinner|She cooking dinner,She is cook dinner,She are cooking dinner|그녀는 저녁을 하고 있다
They (play) outside|They are playing outside|They is playing outside,They playing outside,They are play outside|그들은 밖에서 놀고 있다
He (run) in the park|He is running in the park|He is runing in the park,He running in the park,He is run in the park|그는 공원에서 달리고 있다
We (make) a cake|We are making a cake|We are makeing a cake,We making a cake,We are make a cake|우리는 케이크를 만들고 있다
It (rain)|It is raining|It raining,It is rain,It are raining|비가 오고 있다`, `
I=나/am=~이다/eating=먹는 중/lunch=점심|점심 먹고 있어요
it=날씨/is=~이다/raining=비 오는 중|비가 오고 있어요`),
    G('과거형 -ed', '<p>지난 일은 동사 끝에 <b>-ed</b>: play → played, watch → watched.</p><p>e로 끝나면 <b>-d</b>만: like → liked. be동사 과거는 <b>was / were</b>.</p>', `
I (watch) a movie yesterday|I watched a movie yesterday|I watch a movie yesterday,I watching a movie yesterday,I watchd a movie yesterday|나는 어제 영화를 봤다
She (cook) dinner last night|She cooked dinner last night|She cook dinner last night,She cooks dinner last night,She cookd dinner last night|그녀는 어젯밤 저녁을 했다
We (like) the hotel|We liked the hotel|We likeed the hotel,We like the hotel,We likes the hotel|우리는 그 호텔이 좋았다
I (be) tired yesterday|I was tired yesterday|I were tired yesterday,I am tired yesterday,I be tired yesterday|나는 어제 피곤했다
They (be) at home|They were at home|They was at home,They are at home,They be at home|그들은 집에 있었다
He (play) soccer|He played soccer|He play soccer,He plays soccer,He playd soccer|그는 축구를 했다`, `
I=나/watched=봤다/a=한 편의/movie=영화/yesterday=어제|어제 영화를 봤어요
I=나/was=~였다/tired=피곤한|피곤했어요`),
    G('불규칙 과거형', '<table><tr><td>go → <b>went</b></td><td>eat → <b>ate</b></td></tr><tr><td>see → <b>saw</b></td><td>have → <b>had</b></td></tr><tr><td>buy → <b>bought</b></td><td>make → <b>made</b></td></tr><tr><td>come → <b>came</b></td><td>take → <b>took</b></td></tr></table>', `
I (go) to Busan last week|I went to Busan last week|I goed to Busan last week,I go to Busan last week,I gone to Busan last week|나는 지난주에 부산에 갔다
We (eat) pizza|We ate pizza|We eated pizza,We eat pizza,We eaten pizza|우리는 피자를 먹었다
She (buy) a bag|She bought a bag|She buyed a bag,She buy a bag,She boughted a bag|그녀는 가방을 샀다
I (see) a rabbit|I saw a rabbit|I seed a rabbit,I see a rabbit,I seen a rabbit|나는 토끼를 봤다
He (have) a cold|He had a cold|He haved a cold,He has a cold,He haves a cold|그는 감기에 걸렸었다
They (come) home late|They came home late|They comed home late,They come home late,They comes home late|그들은 늦게 집에 왔다`, `
I=나/went=갔다/to=~에/Busan=부산|부산에 갔어요
we=우리/ate=먹었다/pizza=피자|우리는 피자를 먹었어요`),
    G('can (할 수 있다)', '<p><b>can + 동사원형</b> = ~할 수 있다. 부정은 <b>can\'t</b>, 질문은 <b>Can you</b> ~?</p><p>can 뒤에는 -s를 붙이지 않아요: She can swim.</p>', `
I (can / swim)|I can swim|I can swimming,I cans swim,I can to swim|나는 수영할 수 있다
She (can / speak) English|She can speak English|She cans speak English,She can speaks English,She can to speak English|그녀는 영어를 할 수 있다
I can drive → 부정|I can't drive|I don't can drive,I can drive not,I can't driving|나는 운전을 못 한다
You can help me → 질문|Can you help me?|Do you can help me?,You can help me?,Can you helping me?|도와줄 수 있어?
He can cook → 질문|Can he cook?|Does he can cook?,Can he cooks?,He can cook?|그는 요리할 수 있어?
We can go now → 부정|We can't go now|We don't can go now,We can no go now,We can't going now|우리는 지금 갈 수 없다`, `
can=~할 수 있니/you=너/help=돕다/me=나를|도와줄 수 있어요?
I=나/can't=~할 수 없다/drive=운전하다|저는 운전을 못 해요`),
    G('will (~할 것이다)', '<p><b>will + 동사원형</b> = ~할 것이다 / ~할게요. 줄여서 I\'ll.</p><p>부정은 <b>won\'t</b> (will not).</p>', `
I (will / call) you|I will call you|I will calling you,I will calls you,I will to call you|내가 전화할게
It (will / rain) tomorrow|It will rain tomorrow|It will rains tomorrow,It wills rain tomorrow,It will raining tomorrow|내일 비가 올 것이다
She will come → 부정|She won't come|She will come not,She don't will come,She won't comes|그녀는 안 올 것이다
You will be late → 질문|Will you be late?|Do you will be late?,You will be late?,Will you are late?|늦을 거야?
We (will / meet) at six|We will meet at six|We will meeting at six,We will meets at six,We wills meet at six|우리는 6시에 만날 것이다
I (will / help) you|I'll help you|I'll helping you,I'll helps you,I'll to help you|내가 도와줄게`, `
I'll=내가 ~할게/call=전화하다/you=너에게|전화할게요
it=날씨/will=~할 것이다/rain=비 오다/tomorrow=내일|내일 비가 올 거예요`),
    G('There is · There are', '<p><b>There is + 하나</b> / <b>There are + 여러 개</b> = ~이 있다.</p><p>질문은 <b>Is there</b> ~? / <b>Are there</b> ~?</p>', `
___ a cat on the sofa|There is a cat on the sofa|There are a cat on the sofa,It is a cat on the sofa,There have a cat on the sofa|소파 위에 고양이가 있다
___ two books on the desk|There are two books on the desk|There is two books on the desk,They are two books on the desk,There has two books on the desk|책상 위에 책이 두 권 있다
there is a bank near here → 질문|Is there a bank near here?|Are there a bank near here?,There is a bank near here?,Does there a bank near here?|이 근처에 은행 있어요?
___ many people|There are many people|There is many people,It are many people,There have many people|사람이 많다
there is milk → 부정|There isn't any milk|There aren't any milk,There don't any milk,There not is any milk|우유가 없다
___ a park near my house|There is a park near my house|There are a park near my house,It has a park near my house,There have a park near my house|우리 집 근처에 공원이 있다`, `
is there=~이 있니/a=하나의/bank=은행/near=가까이/here=여기|이 근처에 은행 있어요?
there are=~들이 있다/many=많은/people=사람들|사람이 많아요`),
    G('소유격 my · your · his · her', '<table><tr><td>I → <b>my</b></td><td>you → <b>your</b></td><td>he → <b>his</b></td></tr><tr><td>she → <b>her</b></td><td>we → <b>our</b></td><td>they → <b>their</b></td></tr></table><p>사람 이름은 <b>\'s</b>: Mina\'s bag.</p>', `
(I) name is Mina|My name is Mina|I name is Mina,Me name is Mina,Mine name is Mina|내 이름은 미나다
Is this (you) bag?|Is this your bag?|Is this you bag?,Is this yours bag?,Is this you're bag?|이거 네 가방이야?
(he) car is red|His car is red|He car is red,Him car is red,He's car is red|그의 차는 빨갛다
(she) hair is long|Her hair is long|She hair is long,Hers hair is long,She's hair is long|그녀의 머리는 길다
(we) house is small|Our house is small|We house is small,Us house is small,Ours house is small|우리 집은 작다
Mina + bag|Mina's bag|Mina bag,Minas bag,bag Mina|미나의 가방`, `
my=나의/name=이름/is=~이다/Mina=미나|제 이름은 미나예요
is=~이니/this=이것/your=너의/bag=가방|이거 당신 가방이에요?`)
  ] });
})();
