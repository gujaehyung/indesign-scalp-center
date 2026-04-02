const https = require('https');
const fs = require('fs');
const path = require('path');

const GEMINI_KEY = 'AIzaSyDPPEuBSu-rUAqjyUx3wIMG3EJ_wFwSVzA';
const OUTPUT_DIR = path.join(__dirname, 'generated_images');

// ============================================
// Gemini REST API 호출
// ============================================
function httpPost(hostname, reqPath, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = https.request({
            hostname,
            path: reqPath,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 300000,
        }, (res) => {
            let raw = '';
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    try {
                        const err = JSON.parse(raw);
                        reject(new Error(`API (${res.statusCode}): ${err.error?.message || raw.substring(0, 300)}`));
                    } catch (e) {
                        reject(new Error(`API (${res.statusCode}): ${raw.substring(0, 300)}`));
                    }
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

// ============================================
// Gemini 이미지 생성
// ============================================
async function generateImage(prompt, outputPath) {
    const raw = await httpPost(
        'generativelanguage.googleapis.com',
        `/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_KEY}`,
        {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_modalities: ["image", "text"] },
        }
    );

    const response = JSON.parse(raw);
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync(outputPath, buffer);
                return { success: true, size: buffer.length };
            }
        }
    }
    throw new Error('no image data');
}

// ============================================
// 두피탈모센터 홈페이지용 이미지 프롬프트
// (참고: 리얼 클리닉 사진풍, Before/After 그리드, 전문가 검사/시술 장면)
// ============================================
const imagePrompts = [
    // === 메인 / 히어로 ===
    {
        name: 'hero_banner',
        prompt: 'Professional wide photograph of a premium Korean scalp care clinic interior. Real photographic style. Clean modern treatment room with a comfortable reclining chair, advanced scalp analysis monitor on the wall showing hair follicle magnification, LED therapy device nearby. Warm beige and white interior, soft indirect lighting, fresh green plants. A female Korean specialist in black uniform standing beside the equipment (seen from behind, no face). Photorealistic, 16:9 wide landscape, premium medical spa atmosphere. No text, no logo, no watermark.'
    },
    // === 두피 정밀 검사 장면 1 (전문가가 환자 검사) ===
    {
        name: 'scalp_exam_specialist',
        prompt: 'Real photograph of a Korean female hair care specialist examining a female patient scalp in a clean modern clinic. The specialist wears a black uniform and uses a handheld digital scalp microscope camera on the patient head. A large monitor beside them displays magnified scalp and hair follicle close-up image. Clean white clinical interior, bright professional lighting. Both people seen from the side, faces not clearly visible. Photorealistic, natural clinic photography style. No text, no logo, no watermark.'
    },
    // === 두피 정밀 검사 장면 2 (모니터 상담) ===
    {
        name: 'scalp_exam_monitor',
        prompt: 'Real photograph of a Korean female specialist and a female patient sitting together looking at a large monitor screen showing detailed scalp analysis X-ray style images. Modern clean clinic consultation desk, the specialist is pointing at the screen explaining results. Both seen from behind or side angle, faces not clearly visible. Clean white and beige interior, professional medical atmosphere. Photorealistic, natural lighting. No text, no logo, no watermark.'
    },
    // === 남성 탈모 비포&애프터 (2x2 그리드) ===
    {
        name: 'male_before_after',
        prompt: 'Medical before and after comparison photo grid (2x2 layout) showing male hair loss treatment results. Top-left: Before photo of Korean male M-shaped receding hairline from front-side angle. Top-right: Before photo of same male showing thinning crown area from top view. Bottom-left: After photo showing improved hairline with new hair growth from same front-side angle. Bottom-right: After photo showing thicker fuller crown area from same top view. Each photo has subtle green label "Before" or "After" in corner. Small white downward arrow between top and bottom rows. Realistic medical documentation photography style, consistent lighting across all 4 photos. Clean white border between photos.'
    },
    // === 여성 탈모 비포&애프터 (2x2 그리드) ===
    {
        name: 'female_before_after',
        prompt: 'Medical before and after comparison photo grid (2x2 layout) showing female hair loss treatment results. Top-left: Before photo of Korean female showing thinning hair at the crown/part line from top view. Top-right: Before photo showing sparse hair density from another angle. Bottom-left: After photo showing significantly improved hair density at crown from same top view angle. Bottom-right: After photo showing thicker fuller hair from the same angle. Each photo has subtle green label "Before" or "After" in corner with white downward arrow between rows. Realistic medical photography, consistent lighting. Clean white border between photos.'
    },
    // === 두피 현미경 비포&애프터 (모공 클로즈업) ===
    {
        name: 'microscope_before_after',
        prompt: 'Medical before and after comparison photo grid (2x2 layout) showing scalp microscope examination results. Top-left: Before photo showing microscopic close-up of unhealthy scalp with thin sparse hair follicles, visible dandruff, redness, and clogged pores. Top-right: Before photo of another area showing weak thin hair strands emerging from follicles. Bottom-left: After photo of same area showing healthier scalp, cleaner pores, thicker hair strands growing. Bottom-right: After photo showing improved hair density and multiple healthy hair strands per follicle. Dermatoscopy imaging style, high magnification. Green "Before"/"After" labels, white arrow between rows. Realistic medical documentation.'
    },
    // === LED / 광선 치료 시술 장면 ===
    {
        name: 'led_treatment',
        prompt: 'Real photograph of LED light therapy treatment being performed on a patient scalp at a Korean hair loss clinic. Close-up of a round LED device emitting red and blue light being held by gloved hands over the patient scalp. Patient sitting in a comfortable white treatment chair. Modern clinical background with medical equipment visible. Warm professional lighting, sterile clean environment. Patient face not visible, shot from behind/above. Photorealistic, medical treatment photography. No text, no logo, no watermark.'
    },
    // === MTS / 마이크로니들링 시술 장면 ===
    {
        name: 'mts_treatment',
        prompt: 'Real photograph of microneedling (MTS) scalp treatment being performed at a Korean hair clinic. Close-up of gloved hands using a derma roller or microneedling device on patient scalp. Growth factor serum being applied. Patient reclined in treatment chair, face not visible. Clean sterile clinic environment, professional lighting. Medical equipment and serum bottles visible in background. Photorealistic, clinical documentation style. No text, no logo, no watermark.'
    },
    // === PRP 성장인자 치료 ===
    {
        name: 'prp_therapy',
        prompt: 'Real photograph of PRP (platelet-rich plasma) hair loss therapy preparation and injection at a Korean clinic. Close-up showing golden-colored PRP serum in vials and syringes on a sterile medical tray. A centrifuge machine visible nearby. Gloved hands preparing the injection. Clean white medical environment, bright clinical lighting. Professional medical procedure aesthetic. No faces visible. Photorealistic. No text, no logo, no watermark.'
    },
    // === 홈케어 두피 제품 라인업 ===
    {
        name: 'homecare_products',
        prompt: 'Professional product photography of premium Korean scalp care products arranged on a clean white marble surface. Amber glass bottles of scalp serum, hair growth ampoule set, scalp shampoo, a wooden scalp massage brush, and a scalp tonic spray. Minimalist arrangement with fresh green eucalyptus leaf accents. Soft natural window lighting from the side, luxury cosmetic brand feel. No brand names visible, no text, no logo, no watermark. Photorealistic, high-end flat-lay product photography.'
    },
    // === 상담실 인테리어 ===
    {
        name: 'consultation_room',
        prompt: 'Real photograph of an elegant private consultation room in a premium Korean hair loss treatment clinic. Modern minimalist interior with warm wood accent wall, comfortable beige chairs across a clean white desk, a large monitor on the desk showing scalp analysis software. Warm indirect LED strip lighting, a small indoor plant on the desk. Calm, trustworthy, welcoming atmosphere. No people. Photorealistic, interior architecture photography. No text, no logo, no watermark.'
    },
    // === 클리닉 시술실 전경 ===
    {
        name: 'treatment_room',
        prompt: 'Real photograph of a modern Korean scalp treatment room with multiple treatment stations. Each station has a comfortable reclining chair, LED therapy device on an arm, and a small monitor. Clean white and beige interior, bright but warm lighting. Sterile but welcoming medical spa environment. Professional equipment neatly organized. No people. Photorealistic, interior photography. No text, no logo, no watermark.'
    },
    // === 클리닉 외관 (야간) ===
    {
        name: 'clinic_exterior',
        prompt: 'Real photograph of a modern premium Korean medical clinic building exterior at evening twilight. Clean contemporary facade with large glass windows showing warm interior lighting. Elegant entrance with minimalist design, small landscaped plants. The sky is deep blue twilight. Welcoming warm glow from inside. Premium professional medical facility aesthetic. No readable text on signs, no logo, no watermark. Photorealistic, architectural photography.'
    },
    // === 탈모 유형 안내 (M자/정수리/원형/여성형) ===
    {
        name: 'hair_loss_types',
        prompt: 'Clean medical infographic illustration showing 4 types of hair loss patterns. Four abstract head silhouettes in a row: 1) M-shaped male receding hairline, 2) crown/vertex thinning, 3) circular alopecia areata patch, 4) female diffuse thinning along the part line. Each shown from the appropriate angle (front, top, side, top). Minimalist flat design with soft medical colors - light blue background sections, mint green accents. Clean white overall background. Professional medical educational style. No real photos, no text labels, no logo, no watermark.'
    },
    // === 시술 프로세스 4단계 ===
    {
        name: 'treatment_process_steps',
        prompt: 'Clean modern infographic illustration showing 4-step hair loss treatment process in a horizontal row. Four circular icons connected by dotted arrows: 1) Consultation icon - two people at a desk, 2) Diagnosis icon - magnifying glass over scalp, 3) Treatment icon - medical device treating hair, 4) Result icon - healthy full hair. Soft pastel colors: mint green, light blue, warm coral, gold. Clean white background, modern flat design style. Professional medical service illustration. No text, no numbers, no logo, no watermark.'
    },
    // === 건강한 모발 결과 이미지 ===
    {
        name: 'healthy_hair_result',
        prompt: 'Beautiful close-up photograph of healthy, thick, shiny Korean black hair. Back view of a woman head showing dense, voluminous, lustrous hair with beautiful light reflections. Hair flowing naturally with visible healthy texture. Soft studio lighting, clean neutral beige background. Premium hair care advertising quality. No face visible at all, purely focused on the beautiful healthy hair. Photorealistic, high quality. No text, no logo, no watermark.'
    },
    // === 고객 후기 / 리뷰 섹션 배경 ===
    {
        name: 'review_section_bg',
        prompt: 'Soft abstract background image for customer testimonials section. Gentle warm bokeh lights in gold and cream tones, clean gradient from light warm beige to pure white. Very subtle abstract hair strand silhouettes in soft focus. Calming, premium, trustworthy mood. Extremely minimal and elegant. No people, no objects, no text, no logo, no watermark. Soft focus photography, warm tones.'
    },
    // === FAQ 섹션 배경 ===
    {
        name: 'faq_section_bg',
        prompt: 'Ultra clean minimal gradient background for a medical FAQ section. Soft smooth transition from very light mint green at the top to pure white at the bottom. Extremely subtle thin geometric line patterns. Clean, calm, professional medical aesthetic. Absolutely minimal. No people, no objects, no text, no logo, no watermark. Abstract clean gradient.'
    },
    // === 예약 CTA 배너 ===
    {
        name: 'reservation_cta_banner',
        prompt: 'Wide cinematic banner image for a reservation call-to-action section. Warm golden hour lighting creating beautiful lens flare and bokeh. Soft abstract warm gradient from amber to cream. Subtle silhouette of healthy flowing hair strands catching the golden light. Inviting, hopeful, encouraging warm atmosphere. Premium luxury feel. 16:9 wide landscape composition. No people, no text, no logo, no watermark. Abstract warm photography.'
    },
    // === 원장/전문가 프로필 배경 ===
    {
        name: 'specialist_profile_bg',
        prompt: 'Professional blurred background for a staff profile section on a medical website. Soft focus photograph of a modern Korean clinic interior - white coat hanging on a rack, bookshelf with medical references, framed certificates on wall (all blurred and unreadable), clean organized desk. Warm professional ambient lighting, very shallow depth of field creating beautiful bokeh. Trustworthy academic medical atmosphere. No people, no readable text, no logo, no watermark. Photorealistic.'
    },
];

// ============================================
// 메인 실행
// ============================================
async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log('='.repeat(55));
    console.log('  두피탈모센터 홈페이지 이미지 생성');
    console.log('='.repeat(55));
    console.log(`  총 ${imagePrompts.length}개 이미지 생성 예정`);
    console.log(`  저장 위치: ${OUTPUT_DIR}`);
    console.log('='.repeat(55));

    let success = 0, fail = 0;

    for (let i = 0; i < imagePrompts.length; i++) {
        const { name, prompt } = imagePrompts[i];
        const filename = `${String(i + 1).padStart(2, '0')}_${name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);

        if (fs.existsSync(filepath)) {
            console.log(`  [skip] ${filename}`);
            success++;
            continue;
        }

        console.log(`\n[${i + 1}/${imagePrompts.length}] ${name}`);

        let retries = 0;
        while (retries < 3) {
            try {
                const result = await generateImage(prompt, filepath);
                console.log(`  OK ${filename} (${(result.size / 1024).toFixed(0)}KB)`);
                success++;
                break;
            } catch (err) {
                retries++;
                if (retries < 3) {
                    console.log(`  retry ${retries}/3: ${err.message}`);
                    await new Promise(r => setTimeout(r, 5000));
                } else {
                    console.log(`  FAIL ${filename}: ${err.message}`);
                    fail++;
                }
            }
        }

        if (i < imagePrompts.length - 1) {
            await new Promise(r => setTimeout(r, 4000 + Math.random() * 2000));
        }
    }

    console.log('\n' + '='.repeat(55));
    console.log(`  완료: ${success} ok / ${fail} fail (total ${imagePrompts.length})`);
    console.log(`  ${OUTPUT_DIR}`);
    console.log('='.repeat(55));
}

main().catch(err => { console.error(err.message); process.exit(1); });
