const https = require('https');
const fs = require('fs');
const path = require('path');

const GEMINI_KEY = 'AIzaSyDPPEuBSu-rUAqjyUx3wIMG3EJ_wFwSVzA';
const BASE_DIR = path.join(__dirname, 'generated_images');

function httpPost(hostname, reqPath, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = https.request({ hostname, path: reqPath, method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 300000 }, (res) => {
            let raw = '';
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    try { const err = JSON.parse(raw); reject(new Error(`API(${res.statusCode}): ${err.error?.message || raw.substring(0, 200)}`)); }
                    catch (e) { reject(new Error(`API(${res.statusCode}): ${raw.substring(0, 200)}`)); }
                    return;
                }
                resolve(raw);
            });
        });
        req.on('error', (e) => reject(new Error(e.message)));
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(data);
        req.end();
    });
}

async function gen(prompt, outputPath) {
    const raw = await httpPost('generativelanguage.googleapis.com',
        `/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_modalities: ['image', 'text'] } }
    );
    const response = JSON.parse(raw);
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync(outputPath, buffer);
                return buffer.length;
            }
        }
    }
    throw new Error('no image data');
}

// ============================================
// 주제별 프롬프트 정의 (6개 카테고리 x 20장)
// ============================================
const categories = {
    '01_비포애프터': [
        { name: '남성_M자탈모_정면', prompt: 'Medical before and after 2x2 grid photo. Top row labeled "Before": Korean male with M-shaped receding hairline, front view showing thinning temples. Bottom row labeled "After": same angle showing restored hairline with new hair growth. Green Before/After labels, white arrow between rows. Realistic medical documentation photography. Clean white borders.' },
        { name: '남성_M자탈모_측면', prompt: 'Medical before and after 2x2 grid photo. Top row "Before": Korean male receding hairline from left side angle, visible temple thinning. Top right: same from right side. Bottom row "After": improved hairline both sides with thicker coverage. Green labels, white downward arrow. Consistent clinical lighting, medical photo style.' },
        { name: '남성_정수리_위에서', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean male crown/vertex area seen from directly above, showing significant thinning and visible scalp. Bottom "After": same top-down view showing much denser hair coverage at crown. Green Before/After labels, white arrow. Clinical documentation style.' },
        { name: '남성_정수리_뒤에서', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean male back of head showing thinning crown area from behind at slight angle. Bottom "After": same angle showing fuller thicker hair at crown area. Green labels, white arrow between rows. Realistic medical photography, consistent lighting.' },
        { name: '남성_전체탈모_심한', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean male with severe diffuse hair loss, very thin hair across entire top of head, scalp clearly visible. Bottom "After": dramatic improvement with significantly more hair density across entire scalp. Green labels, clinical photography style.' },
        { name: '여성_가르마_위에서', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean female hair part line seen from above, showing wide visible scalp along the part with thinning. Bottom "After": same view showing narrower part line with denser hair. Green Before/After labels, white arrow. Medical documentation photo.' },
        { name: '여성_정수리_위에서', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean female crown area from above showing thinning hair and visible scalp at top. Bottom "After": same angle showing improved density, less visible scalp. Green labels, white arrow. Realistic clinical photography.' },
        { name: '여성_앞머리_이마라인', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean female frontal hairline showing recession and thinning at temples and forehead area. Bottom "After": improved hairline with baby hairs and fuller coverage at forehead. Green labels, clinical photo style.' },
        { name: '여성_전체볼륨_뒤에서', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean female hair from behind, showing thin flat hair with little volume, scalp visible through hair. Bottom "After": same angle showing noticeably thicker, more voluminous hair. Green labels, medical photo.' },
        { name: '여성_옆모습_볼륨비교', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean female side profile showing thin flat hair close to scalp. Bottom "After": same side view showing lifted hair with more body and volume. Green Before/After labels. Clinical photography.' },
        { name: '두피현미경_모공막힘', prompt: 'Medical before and after 2x2 grid of scalp microscope images. Top "Before": high magnification showing clogged hair follicles with sebum buildup and dead skin. Bottom "After": same area showing clean open follicles with healthy hair emerging. Dermatoscopy imaging, green labels.' },
        { name: '두피현미경_모발굵기', prompt: 'Medical before and after 2x2 grid of scalp microscope images. Top "Before": magnified view showing thin wispy hair strands, single hairs per follicle. Bottom "After": thicker hair strands, multiple hairs growing from follicle units. Dermatoscopy style, green labels, white arrow.' },
        { name: '두피현미경_두피홍조', prompt: 'Medical before and after 2x2 grid of scalp microscope. Top "Before": inflamed red irritated scalp with visible redness around follicles. Bottom "After": calm healthy pinkish-beige scalp with reduced redness. Dermatoscopy imaging, green Before/After labels.' },
        { name: '두피현미경_비듬각질', prompt: 'Medical before and after 2x2 grid of scalp microscope. Top "Before": scalp covered with visible white dandruff flakes and dry scaly patches around hair. Bottom "After": clean clear scalp, no flaking, healthy skin. Microscope imaging, green labels.' },
        { name: '두피현미경_모근건강', prompt: 'Medical before and after 2x2 grid of scalp microscope. Top "Before": weak thin hair roots, hair bulbs barely visible, fragile looking. Bottom "After": strong thick hair roots anchored firmly, healthy dark bulbs visible at base. Dermatoscopy, green labels.' },
        { name: '원형탈모_치료과정', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean person with circular alopecia areata patch on side of head, smooth bald circle visible. Bottom "After": same area months later with new hair regrowing to fill the patch. Green labels, medical documentation.' },
        { name: '남성_이마라인_3개월차', prompt: 'Medical before and after 2x2 grid showing 3-month progress. Top "Before": Korean male with high receding forehead hairline. Bottom "After": hairline lowered with visible new growth, fine baby hairs along the new hairline. Green labels, clinical photography.' },
        { name: '여성_스트레스탈모', prompt: 'Medical before and after 2x2 grid. Top "Before": Korean female with stress-related diffuse hair shedding, visibly thinner ponytail and wider part. Bottom "After": recovered thicker hair, fuller ponytail volume. Green labels, medical documentation style.' },
        { name: '남성_6개월_종합비교', prompt: 'Medical before and after showing 6-month comprehensive comparison. Left column "Before" with 2 photos: Korean male front view and top view showing significant thinning. Right column "After" 6 months: same angles with dramatic hair density improvement. Green labels, white arrows, clinical documentation.' },
        { name: '여성_12개월_종합비교', prompt: 'Medical before and after showing 12-month comprehensive results. Left "Before": Korean female top view and back view showing thin hair. Right "After" 12 months: same angles with visibly fuller thicker hair throughout. Green labels, professional medical documentation photography.' },
    ],
    '02_시술장면': [
        { name: 'LED치료_빨간빛', prompt: 'Real photograph of red LED light therapy being performed on patient scalp at Korean hair clinic. Close-up of round LED device emitting warm red light over scalp. Gloved hands holding device. Patient in white reclining chair, face not visible. Clean clinical environment. Photorealistic. No text, no logo.' },
        { name: 'LED치료_파란빛', prompt: 'Real photograph of blue LED phototherapy treatment on scalp at Korean clinic. Round LED panel with blue lights held above patient head. Clinical setting with medical equipment in background. Patient reclined, no face visible. Professional medical photography. No text, no logo.' },
        { name: 'LED치료_복합광', prompt: 'Real photograph of combination red and blue LED scalp therapy at premium Korean clinic. LED device showing both red and blue lights simultaneously. Wide shot showing the treatment chair and surrounding equipment. Patient relaxed, face not visible. No text, no logo.' },
        { name: 'MTS_더마롤러', prompt: 'Close-up photograph of microneedling derma roller being used on patient scalp at Korean hair clinic. Gloved hands rolling MTS device over scalp with growth factor serum applied. Medical tray with bottles nearby. Patient reclined, face barely visible. Sterile clinical environment. No text, no logo.' },
        { name: 'MTS_더마펜', prompt: 'Close-up photograph of dermapen microneedling treatment on scalp. Gloved hands holding an electronic dermapen device touching the patient scalp. Small serum droplets visible on scalp surface. Clean medical environment. No face visible. Photorealistic. No text, no logo.' },
        { name: 'PRP_채혈과정', prompt: 'Photograph of blood draw preparation for PRP hair therapy. Gloved hands drawing blood from patient arm with tourniquet. PRP tubes and centrifuge visible on nearby medical cart. Clean clinical setting, Korean hair loss clinic. No faces clearly visible. Medical documentation style. No text, no logo.' },
        { name: 'PRP_원심분리', prompt: 'Close-up photograph of PRP centrifuge machine processing blood samples for hair growth therapy. Multiple tubes visible in the centrifuge. Golden-colored separated PRP visible in tubes. Clean laboratory environment. Gloved hands nearby. Medical technology aesthetic. No text, no logo.' },
        { name: 'PRP_주입시술', prompt: 'Photograph of PRP injection being administered to patient scalp. Gloved hands injecting golden PRP serum with fine needle into scalp area. Patient reclined in treatment chair. Clean Korean clinic environment, medical equipment visible. No face visible. No text, no logo.' },
        { name: '메조테라피_주입', prompt: 'Photograph of mesotherapy hair treatment at Korean clinic. Multiple fine needle injections being administered to scalp by specialist with gloves. Growth factor cocktail visible in syringe. Patient in treatment chair, face not visible. Medical procedure photography. No text, no logo.' },
        { name: '두피스케일링_시술', prompt: 'Photograph of scalp scaling/deep cleansing treatment at Korean hair clinic. Specialist using ultrasonic scalp cleansing device on patient scalp. Foam and cleansing solution visible. Patient reclined comfortably, face not visible. Clean spa-medical environment. No text, no logo.' },
        { name: '고주파치료_시술', prompt: 'Photograph of high-frequency scalp treatment at Korean hair clinic. Specialist applying RF (radio frequency) device to patient scalp. Warm glow from the device tip. Patient seated comfortably, face not visible. Modern clinical equipment in background. No text, no logo.' },
        { name: '두피팩_영양공급', prompt: 'Photograph of scalp nutrition pack treatment. Patient scalp covered with nourishing scalp mask/pack in a Korean hair clinic. Specialist applying thick cream-like treatment to scalp with brush. Relaxing spa-like clinical atmosphere. No face visible. No text, no logo.' },
        { name: '산소치료_제트필', prompt: 'Photograph of oxygen jet peel scalp treatment at Korean clinic. Device spraying fine mist of oxygen and nutrients onto patient scalp at close range. Gloved hands operating the jet device. Clean modern treatment room. No face visible. Photorealistic. No text, no logo.' },
        { name: '저출력레이저_헬멧', prompt: 'Photograph of patient wearing low-level laser therapy (LLLT) helmet at Korean hair clinic. Red laser light visible through the dome-shaped helmet covering entire scalp. Patient sitting comfortably in treatment chair. Modern clinical interior. Face partially visible under helmet. No text, no logo.' },
        { name: '성장인자_도포', prompt: 'Close-up photograph of growth factor serum being applied to patient scalp after microneedling at Korean clinic. Gloved hands using dropper to apply clear golden serum across the treated scalp area. Medical bottles and equipment nearby. No face visible. No text, no logo.' },
        { name: '전기자극_치료', prompt: 'Photograph of electrostimulation scalp treatment at Korean hair clinic. Small electrode pads placed on patient scalp connected to a treatment device. Specialist monitoring the equipment settings. Patient comfortable in chair. No face visible. Medical technology setting. No text, no logo.' },
        { name: '두피마사지_전문', prompt: 'Photograph of professional scalp massage treatment at Korean hair clinic. Specialist hands performing therapeutic pressure point massage on patient scalp. Patient eyes closed, relaxed in treatment chair. Warm calming lighting, spa-medical atmosphere. Face barely visible. No text, no logo.' },
        { name: '복합시술_전체과정', prompt: 'Wide photograph showing comprehensive hair treatment session in progress at Korean clinic. Multiple treatment tools visible: LED device, serum bottles, scalp analyzer monitor. Specialist attending to patient in a fully equipped treatment room. Professional clinical atmosphere. No face visible. No text, no logo.' },
        { name: '엑소좀_치료', prompt: 'Photograph of exosome scalp therapy at Korean premium hair clinic. Close-up of vial labeled with clear liquid being drawn into syringe by gloved hands. Advanced medical packaging and sterile tray. Ultra-premium clinical aesthetic. No readable text, no logo.' },
        { name: '시술후_마무리관리', prompt: 'Photograph of post-treatment scalp care at Korean hair clinic. Specialist applying soothing cooling gel to patient scalp after treatment. Gentle patting with gauze. Patient relaxed in reclining chair. Clean calm clinical environment. No face visible. No text, no logo.' },
    ],
    '03_검사진단': [
        { name: '두피스캐너_사용중', prompt: 'Real photograph of Korean female hair specialist using handheld digital scalp scanner on female patient head. Large monitor beside them showing magnified scalp image. Specialist wears black uniform. Clean white modern clinic interior. Side view, faces visible but not main focus. Photorealistic. No text, no logo.' },
        { name: '두피진단_모니터설명', prompt: 'Photograph of specialist explaining scalp analysis results on large monitor to patient. Both seated at desk, seen from behind/side. Monitor shows detailed hair follicle magnification images with analysis data. Clean Korean clinic consultation room. No text, no logo.' },
        { name: '현미경_두피확대50배', prompt: 'Real photograph of a scalp microscope device showing 50x magnification of scalp on its screen. Device positioned on clinical desk. Screen clearly showing magnified hair follicles and pores. Clean white medical environment. No people. Photorealistic. No text, no logo.' },
        { name: '현미경_두피확대200배', prompt: 'Real photograph of advanced digital scalp microscope showing 200x magnification on monitor. Extreme close-up of individual hair follicle structure visible on screen. High-tech medical diagnostic device. Clean laboratory setting. No people. No text, no logo.' },
        { name: '두피진단_종합분석화면', prompt: 'Close-up of a large monitor displaying comprehensive scalp analysis dashboard. Multiple scalp images, graphs showing hair density, thickness measurements, oil level indicators, and color-coded health scores. Korean medical clinic setting. Professional diagnostic software interface. Photorealistic. No readable text needed.' },
        { name: '상담_차트작성', prompt: 'Photograph of Korean female hair specialist writing on patient consultation chart while patient sits across desk. Scalp analysis images visible on monitor between them. Clean professional consultation room. Natural interaction, side angle. No faces as main focus. No text, no logo.' },
        { name: '두피카메라_후두부검사', prompt: 'Photograph of specialist examining back of patient head with handheld scalp camera. Close-up showing the camera device pressed against the occipital area. Monitor in background showing magnified image. Clinical setting. No direct face view. No text, no logo.' },
        { name: '두피카메라_정수리검사', prompt: 'Photograph of specialist examining patient crown area from above with scalp scanner. Top-down perspective showing the scanner on the vertex of head. Monitor showing scalp condition. Korean clinic interior. No face visible. No text, no logo.' },
        { name: '두피카메라_이마라인검사', prompt: 'Photograph of specialist using scalp scanner along patient frontal hairline. Close-up of scanner device at the forehead hairline area. Monitor showing hairline magnification. Korean clinical setting. Patient face partially visible from side. No text, no logo.' },
        { name: '두피카메라_측두부검사', prompt: 'Photograph of specialist scanning patient temple area with digital scalp microscope. Side view showing device placement at temporal hairline. Monitor displaying temple hair density analysis. Clean clinic. No text, no logo.' },
        { name: '탈모유형_상담', prompt: 'Photograph of specialist showing hair loss type diagram on tablet to patient during consultation. Both seated in modern Korean clinic consultation room. Warm lighting, professional but welcoming atmosphere. Side angle. No text, no logo.' },
        { name: '혈액검사_설명', prompt: 'Photograph of specialist reviewing blood test results on screen with patient in Korean hair clinic. Lab results visible on monitor. Professional medical consultation setting with desk and comfortable chairs. Side view of both people. No text, no logo.' },
        { name: '모발밀도측정', prompt: 'Close-up photograph of specialized hair density measurement device being used on patient scalp. Digital readout showing measurement. Specialist gloved hands operating precision instrument. Korean clinic laboratory setting. No face visible. No text, no logo.' },
        { name: '모발인장강도검사', prompt: 'Photograph of hair pull test / tensile strength test being performed at Korean clinic. Specialist gently pulling hair strand with specialized tool to test strength. Close-up of the testing procedure. Clinical setting. No face visible. No text, no logo.' },
        { name: '두피유분도측정', prompt: 'Photograph of scalp oil level measurement at Korean hair clinic. Specialist pressing oil detection device against patient scalp. Small digital device showing reading. Clinical precision diagnostic setting. Close-up. No face visible. No text, no logo.' },
        { name: '두피수분도측정', prompt: 'Photograph of scalp hydration level measurement device being used on patient scalp at Korean clinic. Small handheld moisture meter pressed against scalp surface. Clean medical environment. Close-up shot. No face visible. No text, no logo.' },
        { name: '초진_전체두피사진촬영', prompt: 'Photograph of initial full scalp photography session at Korean hair clinic. Patient seated in special photography chair with standardized lighting. Specialist taking photos with professional camera from above. Multiple angle documentation setup. No face visible. No text, no logo.' },
        { name: '진단결과_비교화면', prompt: 'Photograph of a monitor screen showing side-by-side scalp comparison from initial visit vs follow-up. Split screen with improvement metrics and progress indicators. Korean clinic consultation desk setting. Professional diagnostic software. No readable text. No logo.' },
        { name: 'AI두피분석_화면', prompt: 'Photograph of advanced AI-powered scalp analysis system showing results on large screen. Color-coded heat map of scalp health areas, automated measurements, prediction graphs. Futuristic medical technology aesthetic. Korean clinic setting. No readable text. No logo.' },
        { name: '첫방문_종합상담장면', prompt: 'Wide photograph of first-visit comprehensive consultation at Korean hair clinic. Specialist and patient at consultation desk, scalp images on monitor, printed analysis report on desk, hair samples under microscope nearby. Professional welcoming atmosphere. Side angle. No text, no logo.' },
    ],
    '04_클리닉공간': [
        { name: '로비_접수대', prompt: 'Real photograph of premium Korean hair clinic reception lobby. Clean modern reception desk with warm wood and white marble finish. Comfortable waiting chairs, indirect LED lighting, small indoor plants. Warm welcoming atmosphere. No people. Photorealistic interior photography. No text, no logo.' },
        { name: '대기실_전경', prompt: 'Photograph of elegant waiting area in Korean scalp treatment clinic. Comfortable beige sofas, warm lighting, coffee table with magazines, large TV screen on wall showing nature scenes. Premium medical spa feel. No people. Interior photography. No text, no logo.' },
        { name: '상담실_정면', prompt: 'Photograph of private consultation room in Korean hair clinic. Clean desk with large monitor showing scalp analysis, two comfortable chairs facing each other, warm wood accent wall, small plant. Professional yet cozy. No people. No text, no logo.' },
        { name: '상담실_넓은뷰', prompt: 'Wide angle photograph of spacious consultation room. Floor-to-ceiling window with soft curtains, modern minimalist furniture, scalp diagnosis equipment on desk, certificates on wall (blurred). Bright airy feel. Korean clinic. No people. No text, no logo.' },
        { name: '시술실_1인실', prompt: 'Photograph of private single treatment room in Korean hair clinic. One reclining treatment chair, LED therapy arm device, small monitor, serum cart with products. Clean white and beige interior, warm lighting. No people. Interior photography. No text, no logo.' },
        { name: '시술실_다인실', prompt: 'Photograph of multi-station treatment room in Korean hair clinic. 4-5 treatment chairs in a row, each with LED devices and monitors. Privacy curtains between stations. Clean modern clinical interior. No people. Wide angle. No text, no logo.' },
        { name: '시술실_프리미엄VIP', prompt: 'Photograph of VIP premium private treatment suite in Korean hair clinic. Extra spacious room with luxury reclining chair, personal TV, ambient mood lighting, advanced multi-function treatment device. Hotel-like medical spa luxury. No people. No text, no logo.' },
        { name: '두피검사실', prompt: 'Photograph of dedicated scalp examination room. Professional scalp analysis station with large dual monitors, scalp camera on articulated arm, padded examination chair. Well-organized clinical workspace. Korean clinic. No people. No text, no logo.' },
        { name: '제품진열장', prompt: 'Photograph of premium hair care product display shelf in Korean clinic lobby. Glass shelves with beautifully arranged scalp serums, shampoos, ampoules in amber and white bottles. Soft spotlighting. Boutique pharmacy aesthetic. No people. No readable brand names. No text, no logo.' },
        { name: '복도_인테리어', prompt: 'Photograph of clean modern corridor in Korean hair clinic. White walls with warm wood panel accents, soft recessed lighting, numbered room doors. Minimalist gallery-like atmosphere. Premium medical facility corridor. No people. No text, no logo.' },
        { name: '클리닉외관_주간', prompt: 'Photograph of modern Korean hair clinic building exterior during daytime. Contemporary architecture with clean lines, large windows, landscaped entrance. Professional medical building. Blue sky background. No readable text on signage, no logo.' },
        { name: '클리닉외관_야간', prompt: 'Evening twilight photograph of Korean hair clinic exterior. Warm interior lighting glowing through large windows. Modern facade, elegant entrance with subtle landscape lighting. Welcoming premium medical facility. Deep blue sky. No readable text, no logo.' },
        { name: '클리닉입구_자동문', prompt: 'Photograph of Korean hair clinic entrance with automatic glass doors. Clean modern entryway, marble floor, warm lighting from inside. Plants flanking the entrance. Welcoming first impression. No people. No readable text, no logo.' },
        { name: '세미나실_교육공간', prompt: 'Photograph of small seminar/education room in Korean hair clinic. Projection screen, comfortable chairs, presentation podium. Used for patient education sessions. Clean professional meeting room aesthetic. No people. No text, no logo.' },
        { name: '파우더룸', prompt: 'Photograph of a clean powder/grooming room in Korean hair clinic. Large mirror with vanity lighting, comfortable chair, hair dryer, grooming supplies. For patients to freshen up after treatment. Elegant spa aesthetic. No people. No text, no logo.' },
        { name: '원장실_배경', prompt: 'Photograph of clinic director office. Blurred soft focus - white coat on rack, bookshelf with medical books, framed certificates (unreadable), clean desk with monitor. Warm academic medical atmosphere. Shallow depth of field, bokeh. No people. No text, no logo.' },
        { name: '약제조제실', prompt: 'Photograph of clean medication/serum preparation area in Korean hair clinic. Organized shelves with medical supplies, small refrigerator for serums, sterile preparation counter. Professional pharmacy-like space. No people. No text, no logo.' },
        { name: '건물전경_드론뷰', prompt: 'Aerial perspective photograph of modern Korean medical clinic building and its surroundings. Clean contemporary architecture with rooftop garden visible. Landscaped parking area. Premium medical complex. Daytime. No readable text, no logo.' },
        { name: '엘리베이터홀', prompt: 'Photograph of clean modern elevator lobby area in Korean medical building. Marble floors, warm indirect lighting, directory board (blurred), comfortable bench. Premium building common area. No people. No text, no logo.' },
        { name: '야외테라스_휴식공간', prompt: 'Photograph of small outdoor terrace/rest area attached to Korean clinic. Wooden deck with comfortable chairs, small plants and greenery, soft outdoor lighting. Peaceful recovery space for patients. Premium medical spa outdoor area. No people. No text, no logo.' },
    ],
    '05_홈케어제품': [
        { name: '두피세럼_단독', prompt: 'Professional product photography of premium scalp growth serum in amber glass dropper bottle on clean white marble surface. Soft natural side lighting, single golden drop at dropper tip. Luxury skincare brand aesthetic. No brand name, no text, no logo. Photorealistic.' },
        { name: '탈모샴푸_단독', prompt: 'Professional product photography of premium anti-hair loss shampoo bottle. Sleek matte black bottle with pump dispenser on white marble. Small amount of clear shampoo pooled beside it. Clean luxury cosmetic photography. No brand name, no text, no logo.' },
        { name: '앰플세트_3종', prompt: 'Product photography of 3 hair growth ampoule vials in a row. Clear glass vials with golden liquid inside, thin needle-tip applicators. Arranged on white surface with soft shadow. Medical cosmetic product aesthetic. No text, no brand, no logo.' },
        { name: '두피토닉_스프레이', prompt: 'Product photography of scalp tonic spray bottle. Frosted glass spray bottle with fine mist captured mid-spray. Fresh green leaf accent beside it. Clean white background. Premium hair care product aesthetic. No text, no brand, no logo.' },
        { name: '두피마사지브러시', prompt: 'Product photography of premium wooden scalp massage brush with soft silicone bristles. Placed on natural linen cloth with eucalyptus sprigs. Warm natural lighting. Self-care product aesthetic. No text, no brand, no logo.' },
        { name: '풀세트_플랫레이', prompt: 'Flat-lay product photography of complete home scalp care kit. Amber bottles of serum, shampoo, conditioner, scalp tonic spray, massage brush, and ampoule set. Arranged on white marble with green leaf accents. Natural lighting. Luxury product set. No text, no brand, no logo.' },
        { name: '두피팩_크림타입', prompt: 'Product photography of premium scalp treatment mask cream in white jar. Thick creamy texture visible, small wooden spatula beside it. Fresh botanical elements around. Clean white surface. Luxury spa product aesthetic. No text, no brand, no logo.' },
        { name: '탈모영양제_캡슐', prompt: 'Product photography of premium hair growth supplement capsules. Transparent golden capsules in a sleek dark bottle, some capsules artfully scattered on white marble. Medical supplement aesthetic. No text, no brand, no logo.' },
        { name: '두피에센스_오일', prompt: 'Product photography of scalp nourishing essential oil in small dark amber bottle with dropper. Golden oil drop falling. Natural botanical elements (rosemary, peppermint leaves) around. Warm lighting. No text, no brand, no logo.' },
        { name: '헤어미스트_스타일링', prompt: 'Product photography of volumizing hair mist spray bottle. Elegant frosted bottle with fine mist spray captured in air. Light and airy aesthetic. Clean white background. Premium styling product feel. No text, no brand, no logo.' },
        { name: '두피스크럽_각질제거', prompt: 'Product photography of scalp exfoliating scrub in glass jar. Visible granular texture of the scrub cream. Small wooden spoon beside it. Sea salt and botanical elements as props. Clean white surface. No text, no brand, no logo.' },
        { name: '컨디셔너_단독', prompt: 'Product photography of premium hair loss prevention conditioner bottle. White sleek bottle with pump on marble surface. Small pool of silky white conditioner beside it. Clean luxury feel. No text, no brand, no logo.' },
        { name: '제품사용_세럼바르기', prompt: 'Photograph of hands applying scalp serum using dropper onto scalp/hair part line. Close-up showing golden serum drops along the hair part. Self-care routine moment. Warm bathroom lighting. No face visible. No text, no logo.' },
        { name: '제품사용_샴푸거품', prompt: 'Photograph of scalp being washed with premium shampoo, rich luxurious foam on hair. Hands massaging the lather into scalp. Close-up from behind, no face visible. Clean bright bathroom environment. Self-care moment. No text, no logo.' },
        { name: '제품사용_마사지브러시', prompt: 'Photograph of person using wooden scalp massage brush on their head during shower. Close-up from behind showing the brush in use on soapy hair. Steam and warm lighting. Relaxing self-care routine. No face visible. No text, no logo.' },
        { name: '제품사용_토닉뿌리기', prompt: 'Photograph of person spraying scalp tonic onto hair part line. Close-up of spray mist landing on scalp. Mirror reflection visible in background. Morning self-care routine in clean bathroom. No face visible. No text, no logo.' },
        { name: '선물세트_박스', prompt: 'Product photography of premium scalp care gift set in elegant packaging box. Open box revealing neatly arranged bottles, ampoules and tools with silk ribbon. Gift-worthy luxury presentation. Clean white background. No text, no brand, no logo.' },
        { name: '여행용미니세트', prompt: 'Product photography of mini travel-size scalp care kit. Small bottles in a compact pouch/case. Portable sizes of shampoo, serum, tonic. Travel-friendly arrangement on white surface. Cute and practical aesthetic. No text, no brand, no logo.' },
        { name: '리필파우치_에코', prompt: 'Product photography of eco-friendly refill pouches for scalp care products. Kraft paper minimalist pouches with pump bottle beside them. Green plant accent. Sustainable beauty concept. Clean white background. No text, no brand, no logo.' },
        { name: '제품성분_원료이미지', prompt: 'Artistic flat-lay of natural ingredients used in scalp care products. Biotin capsules, saw palmetto berries, green tea leaves, ginseng root, rosemary sprigs, copper peptide vial, arranged on white marble. Natural science meets beauty aesthetic. No text, no logo.' },
    ],
    '06_배경배너': [
        { name: '히어로배너_클리닉', prompt: 'Ultra-wide cinematic banner of premium Korean hair clinic interior. Wide angle showing treatment room with equipment, warm beige tones, soft ambient lighting. 16:9 wide landscape. Specialist standing with back turned near equipment. Premium medical atmosphere. No text, no logo.' },
        { name: '히어로배너_추상', prompt: 'Abstract wide banner background with flowing hair strand silhouettes in warm golden light. Soft bokeh, gradient from deep warm amber to light cream. Elegant and hopeful mood. 16:9 wide landscape. No people, no text, no logo.' },
        { name: '히어로배너_자연', prompt: 'Wide cinematic banner of serene nature scene - soft morning light through green leaves, water droplets on plants. Fresh, clean, renewal concept. Subtle connection to hair growth and vitality. 16:9 wide landscape. No people, no text, no logo.' },
        { name: '서비스소개_배경', prompt: 'Clean minimal background for services section. Soft gradient from warm beige at edges to clean white center. Very subtle abstract pattern of circles and lines. Professional medical website aesthetic. No people, no text, no logo.' },
        { name: '후기섹션_골드보케', prompt: 'Warm golden bokeh background for testimonials section. Soft round light orbs in gold and cream tones. Gentle gradient from warm golden bottom to lighter top. Premium trustworthy mood. No people, no text, no logo.' },
        { name: '후기섹션_민트그린', prompt: 'Soft abstract background in light mint green tones for review section. Gentle gradient with very subtle leaf-like shapes. Fresh clean medical spa mood. Minimal and elegant. No people, no text, no logo.' },
        { name: 'FAQ_민트그라데이션', prompt: 'Ultra clean minimal gradient background. Soft transition from very light mint green at top to pure white at bottom. Subtle hexagonal geometric pattern barely visible. Medical professional aesthetic. No people, no objects, no text, no logo.' },
        { name: 'FAQ_블루그라데이션', prompt: 'Clean minimal gradient background. Soft transition from very light sky blue at top to pure white at bottom. Very subtle abstract molecular pattern. Clean professional medical feel. No people, no objects, no text, no logo.' },
        { name: 'CTA예약_골드웨이브', prompt: 'Wide banner background with warm golden waves of light and bokeh. Abstract flowing golden light streams. Inviting warm encouraging mood. Premium luxury medical feel. 16:9 landscape. No people, no text, no logo.' },
        { name: 'CTA예약_그린호프', prompt: 'Wide banner background with soft green to white gradient. Abstract new growth sprout silhouettes in gentle green. Hope, renewal, fresh start concept. 16:9 landscape. No people, no text, no logo.' },
        { name: '전문가소개_블러배경', prompt: 'Blurred soft focus background of Korean medical clinic office interior. White coat on rack, bookshelves, certificates on wall (all blurred). Warm bokeh lights. Shallow depth of field. Professional academic atmosphere. No people, no readable text, no logo.' },
        { name: '전문가소개_클린화이트', prompt: 'Clean minimal white background with very subtle light grey gradient at edges. Barely visible abstract medical cross pattern. Ultra clean professional doctor profile background. No people, no objects, no text, no logo.' },
        { name: '오시는길_지도배경', prompt: 'Abstract soft map-like background in muted pastel tones. Gentle road lines and building shapes in very light grey on white. Subtle location pin icon shape in soft mint. Clean minimal aesthetic for directions section. No real map, no text, no logo.' },
        { name: '시술과정_단계배경', prompt: 'Wide clean background for treatment process infographic section. Soft horizontal gradient with 4 subtle color zones: mint, light blue, soft coral, warm gold. Smooth transitions. Clean modern medical feel. 16:9 landscape. No people, no text, no logo.' },
        { name: '건강모발_결과이미지', prompt: 'Beautiful close-up of healthy thick shiny Korean black hair flowing. Back view showing dense voluminous lustrous hair with light reflections. Soft studio lighting, clean neutral background. Premium hair care brand quality. No face. No text, no logo.' },
        { name: '건강두피_클로즈업', prompt: 'Artistic close-up photograph of healthy scalp with thick hair strands emerging. Clean pores, healthy pink-beige skin, strong dark hair roots. Macro photography style with soft clinical lighting. Medical beauty aesthetic. No text, no logo.' },
        { name: '가격안내_심플배경', prompt: 'Ultra clean minimal background for pricing section. Very soft warm beige to white gradient. Extremely subtle thin line grid pattern. Clean professional premium medical feel. Absolutely minimal. No people, no objects, no text, no logo.' },
        { name: '블로그_카드배경', prompt: 'Soft abstract background for blog/article cards. Light warm cream gradient with very subtle paper texture. Clean minimal editorial feel. Premium medical content background. No people, no objects, no text, no logo.' },
        { name: '푸터_다크배경', prompt: 'Dark elegant background for website footer section. Deep charcoal grey to near-black gradient. Very subtle abstract hair strand patterns in slightly lighter grey. Premium sophisticated mood. No people, no text, no logo.' },
        { name: '모바일_스플래시배경', prompt: 'Vertical mobile splash screen background. Soft warm gradient from light gold at top to clean white at bottom. Subtle abstract healthy hair strand flowing down. Premium Korean medical brand feel. Portrait orientation 9:16. No people, no text, no logo.' },
    ],
};

async function main() {
    const catNames = Object.keys(categories);
    const totalImages = catNames.reduce((sum, k) => sum + categories[k].length, 0);
    let globalSuccess = 0, globalFail = 0, globalSkip = 0;

    console.log('='.repeat(60));
    console.log('  두피탈모센터 홈페이지 이미지 대량 생성');
    console.log(`  ${catNames.length}개 카테고리 x 20장 = 총 ${totalImages}장`);
    console.log('='.repeat(60));

    for (const catName of catNames) {
        const catDir = path.join(BASE_DIR, catName);
        if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

        const prompts = categories[catName];
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`  [${catName}] ${prompts.length}장`);
        console.log(`${'─'.repeat(60)}`);

        for (let i = 0; i < prompts.length; i++) {
            const { name, prompt } = prompts[i];
            const filename = `${String(i + 1).padStart(2, '0')}_${name}.png`;
            const filepath = path.join(catDir, filename);

            if (fs.existsSync(filepath)) {
                console.log(`  [skip] ${filename}`);
                globalSkip++;
                continue;
            }

            process.stdout.write(`  [${i + 1}/${prompts.length}] ${filename} ... `);

            let retries = 0;
            while (retries < 3) {
                try {
                    const size = await gen(prompt, filepath);
                    console.log(`OK (${(size / 1024).toFixed(0)}KB)`);
                    globalSuccess++;
                    break;
                } catch (err) {
                    retries++;
                    if (retries < 3) {
                        console.log(`retry ${retries}`);
                        await new Promise(r => setTimeout(r, 5000 * retries));
                    } else {
                        console.log(`FAIL: ${err.message.substring(0, 80)}`);
                        globalFail++;
                    }
                }
            }

            // rate limit delay
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`  전체 완료: ${globalSuccess} 성공 / ${globalFail} 실패 / ${globalSkip} 스킵`);
    console.log(`  저장: ${BASE_DIR}`);
    console.log('='.repeat(60));
}

main().catch(err => { console.error(err.message); process.exit(1); });
