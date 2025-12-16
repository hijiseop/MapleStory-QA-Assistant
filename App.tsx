import React, { useState, useCallback } from 'react';
import { generateQAPlan } from './services/gemini';
import { QAPlan, LoadingState, ChecklistItem, InputMode } from './types';
import RiskChart from './components/RiskChart';
import Checklist from './components/Checklist';
import { 
  Leaf, 
  Search, 
  FileText, 
  AlertTriangle, 
  Bug, 
  ClipboardList, 
  ExternalLink,
  Sparkles,
  Loader2,
  Flame,
  History as HistoryIcon,
  MessageSquarePlus,
  Ban
} from 'lucide-react';

const App: React.FC = () => {
  const [inputMode, setInputMode] = useState<InputMode>('TEXT');
  const [inputText, setInputText] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [qaPlan, setQaPlan] = useState<QAPlan | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // URL 자동 생성 로직
  const processInput = (input: string, mode: InputMode): string => {
    if (mode !== 'URL') return input;

    // 숫자만 있거나, maplestory URL 패턴에서 숫자를 추출
    const idMatch = input.match(/(?:News\/All\/|\/)(\d+)/) || input.match(/^(\d+)$/);
    
    if (idMatch && idMatch[1]) {
      const startId = parseInt(idMatch[1], 10);
      const baseUrl = "https://maplestory.nexon.com/Testworld/News/All";
      
      // 시작 ID 포함, 이후 4개(총 5개)의 잠재적 URL 생성
      // 5개까지 넓게 스캔하되, Gemini에게 "날짜/버전이 미래인 것만" 필터링하도록 지시함
      const urls = [];
      for (let i = 0; i < 5; i++) {
        urls.push(`${baseUrl}/${startId + i}`);
      }
      
      console.log("Auto-generated URLs for scanning:", urls);
      return urls.join('\n');
    }

    return input;
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    setLoadingState(LoadingState.LOADING);
    setErrorMsg(null);
    setQaPlan(null);

    try {
      // 입력값 전처리 (URL 자동 확장)
      const processedInput = processInput(inputText, inputMode);
      
      const plan = await generateQAPlan(processedInput, inputMode, additionalContext);
      setQaPlan(plan);
      setLoadingState(LoadingState.SUCCESS);
    } catch (err: any) {
      setErrorMsg(err.message || "알 수 없는 오류가 발생했습니다.");
      setLoadingState(LoadingState.ERROR);
    }
  };

  const toggleTask = useCallback((id: string) => {
    setQaPlan(prev => {
      if (!prev) return null;
      const newChecklist = prev.checklist.map(item => 
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      );
      return { ...prev, checklist: newChecklist };
    });
  }, []);

  const completionPercentage = qaPlan 
    ? Math.round((qaPlan.checklist.filter(i => i.isCompleted).length / qaPlan.checklist.length) * 100) || 0
    : 0;
  
  // Calculate stats for badges
  const communityIssuesCount = qaPlan?.checklist.filter(i => i.source === 'Community').length || 0;
  const historyIssuesCount = qaPlan?.checklist.filter(i => i.source === 'History').length || 0;

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-[#F49026] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <Leaf size={24} className="text-white" fill="white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">MapleStory QA Assistant</h1>
          </div>
          <div className="text-xs font-medium bg-white/10 px-3 py-1 rounded-full">
            Test World Ver. Checker
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* Input Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 mb-8 transition-all hover:shadow-md">
          <div className="flex gap-4 mb-4 border-b border-gray-100 pb-2">
            <button 
              onClick={() => setInputMode('TEXT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'TEXT' 
                  ? 'bg-orange-50 text-orange-600' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <FileText size={16} />
              릴리즈 노트 붙여넣기
            </button>
            <button 
              onClick={() => setInputMode('URL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === 'URL' 
                  ? 'bg-orange-50 text-orange-600' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Search size={16} />
              URL / 번호 자동검색
            </button>
          </div>

          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={inputMode === 'TEXT' 
                ? "여기에 클라이언트 릴리즈 노트 전체 내용을 붙여넣으세요... (예: '직업 밸런스 패치 내용...')"
                : "테스트 월드 게시물 URL 또는 번호를 입력하세요.\n예: 145 (자동으로 146, 147... 등 후속 공지를 찾아 함께 분석합니다)\n또는\nhttps://maplestory.nexon.com/Testworld/News/All/145"
              }
              className="w-full h-40 p-4 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none resize-none text-sm transition-all mb-4"
            />

            {/* Additional Context Input */}
            <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100 mb-4">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-orange-700">
                <MessageSquarePlus size={16} />
                추가 요청사항 (선택)
              </div>
              <input 
                type="text"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="예: 그래픽 관련 버그는 제외해줘, 특정 직업 위주로 봐줘..."
                className="w-full p-2.5 rounded-lg border border-orange-200 text-sm focus:outline-none focus:border-orange-400 bg-white placeholder-gray-400"
              />
            </div>
            
            <div className="flex justify-end">
               {loadingState === LoadingState.LOADING && (
                 <span className="flex items-center mr-4 text-sm text-orange-500 font-medium animate-pulse">
                   메이플 월드 분석 및 날짜 검증 중...
                 </span>
               )}
              <button
                onClick={handleGenerate}
                disabled={!inputText || loadingState === LoadingState.LOADING}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all transform active:scale-95 ${
                  !inputText || loadingState === LoadingState.LOADING
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#F49026] text-white hover:bg-[#e0821d] hover:shadow-orange-200'
                }`}
              >
                {loadingState === LoadingState.LOADING ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                QA 계획 생성
              </button>
            </div>
          </div>
          {inputMode === 'URL' && (
             <p className="mt-2 text-xs text-gray-400">
               * 입력한 번호부터 +4개(총 5개)의 URL을 자동으로 스캔하여, <strong>미래의 패치(버그 수정)</strong>만 반영하고 과거 데이터는 제외합니다.
             </p>
          )}
        </section>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-8 flex items-center gap-3">
            <AlertTriangle size={20} />
            {errorMsg}
          </div>
        )}

        {/* Results Area */}
        {loadingState === LoadingState.SUCCESS && qaPlan && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            
            {/* Left Column: Summary & Risks */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <ClipboardList className="text-orange-500" size={20} />
                  요약 (Summary)
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {qaPlan.summary}
                </p>
                
                {/* Grounding & Discarded URLs */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {qaPlan.groundingUrls && qaPlan.groundingUrls.length > 0 && (
                    <div>
                       <p className="text-xs font-bold text-gray-400 mb-1">참조된 유효 출처</p>
                       <ul className="space-y-1">
                          {qaPlan.groundingUrls.map((url, idx) => (
                            <li key={idx}>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                <ExternalLink size={10} />
                                {url.length > 40 ? url.substring(0, 37) + '...' : url}
                              </a>
                            </li>
                          ))}
                       </ul>
                    </div>
                  )}

                  {qaPlan.discardedUrls && qaPlan.discardedUrls.length > 0 && (
                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                       <p className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1">
                         <Ban size={10} /> 제외된 URL (과거/오류 페이지 감지됨)
                       </p>
                       <ul className="space-y-1">
                          {qaPlan.discardedUrls.map((url, idx) => (
                            <li key={idx} className="text-xs text-gray-400 flex items-center gap-1">
                               <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                               {url.split('/').pop()}번 게시물 (유효하지 않음)
                            </li>
                          ))}
                       </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Chart */}
              <RiskChart risks={qaPlan.risks} />

              {/* High Risks List */}
              <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="text-red-500" size={20} />
                  집중 점검 영역 (High Risks)
                </h2>
                <div className="space-y-3">
                  {qaPlan.risks.filter(r => r.level === 'High').length === 0 && (
                    <p className="text-sm text-gray-400">High Risk 항목이 감지되지 않았습니다.</p>
                  )}
                  {qaPlan.risks.filter(r => r.level === 'High').map((risk, idx) => (
                    <div key={idx} className="bg-red-50 p-3 rounded-lg border border-red-100">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-red-700 text-sm">{risk.area}</span>
                        <span className="text-[10px] font-bold bg-red-200 text-red-800 px-1.5 py-0.5 rounded">HIGH</span>
                      </div>
                      <p className="text-xs text-red-600/80">{risk.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

               {/* Bug Predictions */}
              <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-5">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Bug className="text-purple-500" size={20} />
                  버그 예측 (Bug Predictions)
                </h2>
                <div className="space-y-3">
                  {qaPlan.bugs.map((bug, idx) => (
                    <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                      <div className="flex justify-between items-start mb-1">
                         <div className="flex flex-wrap gap-2 items-center">
                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                 bug.severity === 'Critical' ? 'bg-red-200 text-red-800' :
                                 bug.severity === 'Major' ? 'bg-orange-200 text-orange-800' :
                                 'bg-gray-200 text-gray-800'
                             }`}>
                                 {bug.severity}
                             </span>
                             <span className="text-[10px] font-medium bg-white text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">
                                 {bug.affectedSystem}
                             </span>
                         </div>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{bug.description}</p>
                    </div>
                  ))}
                  {qaPlan.bugs.length === 0 && <p className="text-sm text-gray-400">예측된 버그가 없습니다.</p>}
                </div>
              </div>
            </div>

            {/* Right Column: Checklist */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[600px]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">QA 체크리스트</h2>
                    <div className="flex gap-2 mt-1">
                       {communityIssuesCount > 0 && (
                         <span className="text-[10px] flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                           <Flame size={10} fill="currentColor" /> 인벤 핫이슈 {communityIssuesCount}건
                         </span>
                       )}
                       {historyIssuesCount > 0 && (
                         <span className="text-[10px] flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                           <HistoryIcon size={10} /> 재발 방지 {historyIssuesCount}건
                         </span>
                       )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="text-right">
                       <span className="text-xs text-gray-500 block">진행률</span>
                       <span className="text-lg font-bold text-orange-600">{completionPercentage}%</span>
                     </div>
                     <div className="w-12 h-12 relative">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="#f3f4f6" strokeWidth="4" fill="none" />
                          <circle cx="24" cy="24" r="20" stroke="#F49026" strokeWidth="4" fill="none" 
                            strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * completionPercentage) / 100} 
                            className="transition-all duration-500 ease-out"
                          />
                        </svg>
                     </div>
                  </div>
                </div>

                <Checklist items={qaPlan.checklist} onToggle={toggleTask} />
              </div>
            </div>

          </div>
        )}

        {/* Empty State / Intro */}
        {loadingState === LoadingState.IDLE && (
          <div className="text-center py-20 opacity-60">
             <div className="inline-block bg-orange-100 p-4 rounded-full mb-4">
                <Leaf size={40} className="text-orange-400" />
             </div>
             <h3 className="text-xl font-bold text-gray-600 mb-2">테스트 준비 완료</h3>
             <p className="text-gray-400">상단 입력창에 테스트 월드 릴리즈 내용을 입력하여<br/>맞춤형 QA 플랜을 생성해보세요.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;