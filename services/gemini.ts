import { GoogleGenAI, Type } from "@google/genai";
import { QAPlan, BugPrediction } from "../types";

// Initialize Gemini Client
// IMPORTANT: API Key is obtained from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

export const generateQAPlan = async (
  input: string,
  mode: 'TEXT' | 'URL',
  additionalContext?: string
): Promise<QAPlan> => {
  try {
    const isUrl = mode === 'URL';
    
    // Construct the prompt
    let urlInstructions = '';
    if (isUrl) {
      urlInstructions = `
      [URL 분석 및 유효성 검증 프로토콜 - 매우 중요]
      입력된 텍스트는 메이플스토리 테스트월드 게시물 URL들입니다. (메인 URL + 자동 생성된 후속 URL)
      
      **1단계: 기준점 설정 (Base Version)**
      - 가장 번호가 낮은(첫 번째) URL의 내용에서 **업데이트 날짜**와 **버전(Ver)**을 추출하십시오. 이것이 '기준(Base)'입니다.
      
      **2단계: 후속 URL 검증 (Strict Validation)**
      - 후속 번호(예: 146, 147...) URL들에 접속하여 다음 조건을 확인하십시오:
        1. **Version Check**: 해당 페이지의 본문이 기준 버전보다 **더 높은 숫자**의 버전(Ver)을 다루고 있는가?
        2. **Page Type Check**: 해당 페이지가 특정 업데이트 내용을 담은 '상세 페이지'인가? (만약 '게시판 목록(List)' 페이지라면 100% 리다이렉트된 오류 페이지입니다.)
        3. **Date Check**: 기준 날짜보다 **미래**의 날짜인가?
      
      **3단계: 데이터 필터링 (Action)**
      - 위 조건 중 하나라도 만족하지 못하면(예: 버전이 같거나 낮음, 목록 페이지, 과거 날짜) 해당 URL은 **"유효하지 않은 리다이렉트"**로 간주하고 **'discardedUrls'** 목록에 추가하십시오.
      - 절대 '목록 페이지'에 적힌 과거 업데이트 제목들을 이번 패치 내용으로 착각하여 요약에 포함시키지 마십시오.
      - 오직 **검증을 통과한 미래의 상세 페이지** 내용만 병합하여 분석하십시오.
      
      [검색 도구 사용 시]
      - URL 접속이 차단되면 구글 검색을 통해 "메이플스토리 테스트월드 [번호]"를 검색하십시오. 검색 결과에서도 날짜를 비교하여 최신 글만 반영하십시오.
      `;
    }

    let prompt = `
      당신은 메이플스토리(MapleStory Korea) 전문 QA 리드입니다.
      
      주어진 테스트 월드 릴리즈 노트(또는 검색된 내용)를 분석하여 테스트 계획을 작성해주세요.
      
      ${urlInstructions}

      [사용자 추가 요청사항]
      사용자가 특별히 요청한 다음 지침을 **최우선**으로 반영하십시오:
      "${additionalContext || '없음 (기본 로직대로 수행)'}"

      [분석 관점]
      1. **Logic**: 기능 정상 작동 확인.
      2. **Community**: 패치 날짜 이후의 최신 유저 반응/민심.
      3. **History**: 과거 유사 버그 재발 방지.

      [분석 대상 데이터]
      ${input}
      
      다음 항목들을 포함하여 상세하게 분석해주세요:
      1. **요약 (Summary)**: 
         - 분석에 성공한 **최종 버전 번호**를 명시하십시오.
         - 만약 후속 URL이 모두 유효하지 않다면, 기본 URL 내용만 요약하십시오.
      2. **리스크 분석**: 오류 발생 가능성이 높은 영역.
      3. **QA 체크리스트**: 구체적 테스트 항목.
      4. **버그 예측**: 예상되는 버그 시나리오.

      출력 형식은 반드시 아래와 같은 **Markdown 코드 블록 내의 JSON** 형식을 따라주세요.

      \`\`\`json
      {
        "summary": "...",
        "discardedUrls": ["...", "..."], 
        "risks": [
          { "area": "...", "level": "High", "reason": "..." }
        ],
        "checklist": [
          { 
            "category": "보상 시스템", 
            "task": "...", 
            "source": "Logic"
          }
        ],
        "bugs": [
          { 
            "description": "...", 
            "severity": "Major", 
            "affectedSystem": "..." 
          }
        ]
      }
      \`\`\`
    `;

    // Configure tools
    const tools: any[] = [];
    if (isUrl) {
      tools.push({ googleSearch: {} });
    }

    const config: any = {
      tools: tools,
      systemInstruction: "You are a critical QA Engineer and MapleStory community expert. You strictly verify URL validity dates.",
    };

    // If strictly text mode, we can enforce JSON schema for better reliability.
    if (!isUrl) {
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          discardedUrls: { type: Type.ARRAY, items: { type: Type.STRING } },
          risks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING },
                level: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                reason: { type: Type.STRING },
              }
            }
          },
          checklist: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                task: { type: Type.STRING },
                source: { type: Type.STRING, enum: ["Logic", "Community", "History"] }
              }
            }
          },
          bugs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["Critical", "Major", "Minor"] },
                affectedSystem: { type: Type.STRING }
              }
            }
          }
        }
      };
      // Clean up prompt for JSON mode
      prompt = `
        메이플스토리 릴리즈 노트를 분석하여 QA 계획을 작성하세요.
        
        [사용자 추가 요청사항]
        "${additionalContext || '없음'}"

        입력 데이터:
        ${input}
      `;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config
    });

    let rawText = response.text || "";
    let jsonData: any = {};
    let groundingUrls: string[] = [];

    // Extract grounding URLs if any
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          groundingUrls.push(chunk.web.uri);
        }
      });
    }

    if (!isUrl) {
      // Direct JSON mode
      try {
        jsonData = JSON.parse(rawText);
      } catch (e) {
        console.warn("JSON parse error in text mode:", e);
        // Try simple extraction if direct parse fails
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
             try {
                jsonData = JSON.parse(rawText.substring(start, end + 1));
             } catch (e2) {
                // Last resort
                jsonData = { summary: rawText };
             }
        } else {
             jsonData = { summary: rawText };
        }
      }
    } else {
      // Markdown/Search mode parsing
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}');
      
      let parsed = false;
      if (jsonStart !== -1 && jsonEnd !== -1) {
         try {
            const potentialJson = rawText.substring(jsonStart, jsonEnd + 1);
            jsonData = JSON.parse(potentialJson);
            parsed = true;
         } catch (e) {
            console.warn("Failed to parse JSON substring", e);
         }
      }
      
      if (!parsed) {
         // Fallback if no JSON found
         jsonData = {
            summary: rawText,
            risks: [],
            checklist: [],
            bugs: [],
            discardedUrls: []
          };
      }
    }

    // Handle legacy bug strings if model returns string array instead of objects (fallback compatibility)
    let processedBugs: BugPrediction[] = [];
    if (Array.isArray(jsonData.bugs)) {
      processedBugs = jsonData.bugs.map((b: any) => {
        if (typeof b === 'string') {
          return {
            description: b,
            severity: 'Major', // Default for legacy string format
            affectedSystem: 'General'
          } as BugPrediction;
        }
        return b as BugPrediction;
      });
    }

    // Ensure mandatory fields exist even if empty
    const finalPlan: QAPlan = {
      summary: jsonData.summary || rawText || "내용을 불러올 수 없습니다.",
      risks: Array.isArray(jsonData.risks) ? jsonData.risks : [],
      checklist: Array.isArray(jsonData.checklist) 
        ? jsonData.checklist.map((item: any, index: number) => ({
            id: `task-${index}-${Date.now()}`,
            category: item.category || "일반",
            task: item.task || item.description || "내용 없음",
            isCompleted: false,
            source: item.source || 'Logic'
          })) 
        : [],
      bugs: processedBugs,
      groundingUrls,
      discardedUrls: Array.isArray(jsonData.discardedUrls) ? jsonData.discardedUrls : []
    };

    return finalPlan;

  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("분석 중 오류가 발생했습니다. 잠시 후 다시 시도하거나, 텍스트를 직접 입력해주세요.");
  }
};