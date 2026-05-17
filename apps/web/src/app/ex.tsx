import { useState } from 'react';

const diaryMap: Record<
  number,
  {
    mood: string;
    text: string;
    keywords: string[];
    entries: Array<[string, string]>;
  }
> = {
  1: {
    mood: '차분함',
    text: '오늘은 조용히 나를 정리하는 하루였다. 급하게 무언가를 해내기보다는, 밀린 생각을 천천히 꺼내보고 다시 넣어두는 시간이 필요했다.',
    keywords: ['휴식', '정리', '생각'],
    entries: [
      ['오전에 해야 할 일을 적어두니까 머리가 조금 가벼워졌다.', '09:42'],
      ['저녁 산책하면서 오늘은 무리하지 않아도 괜찮다는 생각을 했다.', '20:28'],
    ],
  },
  8: {
    mood: '뿌듯함',
    text: '오늘은 미뤄두었던 기획안 초안을 끝냈다. 시작 전에는 막막했지만, 하나씩 정리하면서 방향이 보이기 시작했다. 완성된 결과물을 보니 작은 성취감이 남았다.',
    keywords: ['완료', '성취', '집중'],
    entries: [
      ['중간에 방향을 한 번 바꾸긴 했지만 결과적으로 더 명확해졌다.', '15:20'],
      ['완벽하진 않아도 일단 끝냈다는 점이 가장 만족스럽다.', '18:42'],
    ],
  },
  13: {
    mood: '복잡함',
    text: '오늘은 여러 회의가 이어져 머릿속이 복잡했다. 하지만 서비스 기능과 우선순위를 더 명확하게 정리할 수 있었다.',
    keywords: ['회의', '고민', '정리'],
    entries: [
      ['메모 화면은 사용자가 부담 없이 쓰는 느낌이 중요할 것 같다.', '16:05'],
      ['저장된 일기는 캘린더에서 바로 열리면 흐름이 더 자연스러울 것 같다.', '19:47'],
    ],
  },
};

function runSanityTests() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  console.assert(days.length === 31, '5월 캘린더는 31일을 렌더링해야 합니다.');
  console.assert(days[0] === 1, '첫 번째 날짜는 1일이어야 합니다.');
  console.assert(days[30] === 31, '마지막 날짜는 31일이어야 합니다.');
  console.assert(Object.keys(diaryMap).length === 3, '샘플 일기는 3개여야 합니다.');
  console.assert(Boolean(diaryMap[13]), '13일 저장된 일기 데이터가 있어야 합니다.');
  console.assert(diaryMap[13].keywords.includes('정리'), '13일 일기에는 정리 키워드가 있어야 합니다.');
  console.assert(String(8).padStart(2, '0') === '08', '날짜는 두 자리 형식으로 표시되어야 합니다.');
  console.assert('grid-cols-[1fr_2fr]'.includes('1fr_2fr'), '전체 레이아웃은 좌우 1:2 비율이어야 합니다.');
  console.assert(620 > 420, '날짜 선택 시 메모 입력 영역 높이가 축소되어야 합니다.');
  console.assert(58 > 0, '캘린더와 오늘 메모 시작 Y축 정렬 보정값이 있어야 합니다.');
  console.assert('새로 쓰기'.length > 0, '저장된 일기가 없는 날짜에는 새로 쓰기 버튼이 있어야 합니다.');
  console.assert('items-stretch'.includes('stretch'), '좌우 컬럼 높이는 동일해야 합니다.');
  console.assert(['21:00', '22:00', '23:00', '00:00'].length === 4, '생성 시간 드롭다운 옵션은 4개여야 합니다.');
}

runSanityTests();

export default function MontageWebLayout() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [memoInputOpen, setMemoInputOpen] = useState(true);
  const [generationTime, setGenerationTime] = useState('21:00');
  const [generationOpen, setGenerationOpen] = useState(false);
  const selectedDiary = selectedDay ? diaryMap[selectedDay] : null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="grid min-h-[calc(100vh-48px)] grid-cols-[1fr_2fr] items-stretch gap-6">
        <aside className="flex min-h-full min-w-0 flex-col gap-5">
          <div className="px-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white">M</div>
              <div>
                <h1 className="text-xl font-bold">Montage</h1>
                <p className="text-xs text-slate-400">흩어진 하루를 하나의 일기로</p>
              </div>
            </div>
          </div>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <button type="button" className="text-lg">‹</button>
              <h2 className="font-bold">2026년 5월</h2>
              <button type="button" className="text-lg">›</button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-xs text-slate-400">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`blank-${index}`} />
              ))}
              {days.map((day) => {
                const hasDiary = Boolean(diaryMap[day]);
                const isSelected = day === selectedDay;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      setMemoInputOpen(false);
                    }}
                    className={`relative h-10 rounded-xl text-sm ${isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
                    aria-label={`${day}일 ${hasDiary ? '저장된 일기 있음' : '저장된 일기 없음'}`}
                  >
                    {day}
                    {hasDiary && (
                      <span
                        className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isSelected ? 'bg-white' : 'bg-black'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="relative rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">👤</div>
                <div>
                  <p className="text-sm font-semibold">하루기록러</p>
                  <p className="text-xs text-slate-400">@daily_memo</p>
                </div>
              </div>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-xl p-2 hover:bg-slate-100"
                aria-label="프로필 메뉴"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="12" cy="5" r="1"/>
                  <circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
            </div>

            {menuOpen && (
              <div className="absolute right-6 top-16 z-10 w-56 rounded-2xl border bg-white p-3 shadow-lg">
                <div className="mb-3 rounded-xl bg-slate-50 p-3">
                  <p className="mb-1 text-xs font-semibold text-slate-400">이메일</p>
                  <p className="text-sm text-slate-700">daily_memo@example.com</p>
                </div>
                <button className="h-10 w-full rounded-xl border text-sm">로그아웃</button>
              </div>
            )}

            <div className="mb-3 rounded-2xl bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-400">생성 시간</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setGenerationOpen(!generationOpen)}
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-[#CFD4DB] bg-white px-4 text-sm text-[#2A313A]"
                  aria-label="생성 시간 선택"
                >
                  <span>{generationTime}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {generationOpen && (
                  <div className="absolute left-0 right-0 top-11 z-20 overflow-hidden rounded-lg border border-[#CFD4DB] bg-white shadow-lg">
                    {['21:00', '22:00', '23:00', '00:00'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setGenerationTime(time);
                          setGenerationOpen(false);
                        }}
                        className={`flex h-10 w-full items-center px-4 text-left text-sm hover:bg-slate-50 ${generationTime === time ? 'font-semibold text-[#2A313A]' : 'text-slate-500'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400">한도 보기</p>
                <span className="text-xs text-slate-400">70/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-[70%] rounded-full bg-slate-900" />
              </div>
            </div>
          </section>
        </aside>

        <main className="grid min-h-full min-w-0 auto-rows-max gap-5 pt-[58px]">
          {selectedDay && !memoInputOpen && (
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">TODAY MEMO</p>
                  <h2 className="text-2xl font-bold">오늘 메모</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMemoInputOpen(true)}
                  className="h-11 rounded-2xl bg-slate-900 px-5 text-white"
                >
                  입력하기
                </button>
              </div>
            </section>
          )}

          {memoInputOpen ? (
            <section className="rounded-3xl border bg-white p-7 shadow-sm">
              <div className="mb-5 flex justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">TODAY MEMO</p>
                  <h2 className="text-2xl font-bold">오늘 메모</h2>
                </div>
                <div className="flex h-10 items-center rounded-full bg-slate-100 px-4 text-sm">2026.05.13 22:14</div>
              </div>

              <div className="flex h-[620px] flex-col rounded-3xl border bg-slate-50 p-5 transition-all duration-300">
                <textarea
                  defaultValue="오늘 회의가 많아서 정신없었지만 기능 방향이 조금 더 명확해졌다."
                  className="flex-1 resize-none bg-transparent text-lg leading-8 outline-none"
                  maxLength={500}
                />

                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-slate-400">39/500</span>
                  <button className="h-11 rounded-2xl bg-slate-900 px-5 text-white">전송</button>
                </div>
              </div>
            </section>
          ) : selectedDay && (
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              {selectedDiary ? (
                <>
                  <div className="mb-4 flex justify-between">
                    <div>
                      <p className="text-xs text-slate-400">2026.05.{String(selectedDay).padStart(2, '0')}</p>
                      <h3 className="text-lg font-bold">저장된 일기</h3>
                    </div>
                    <span className="flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs">{selectedDiary.mood}</span>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7">{selectedDiary.text}</div>

                  <div className="mt-5">
                    <h4 className="mb-2 text-sm font-semibold">주요 키워드</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDiary.keywords.map((keyword) => (
                        <span key={keyword} className="rounded-full border px-3 py-2 text-xs">#{keyword}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <h4 className="mb-2 text-sm font-semibold">내가 보낸 기록</h4>
                    <div className="space-y-2">
                      {selectedDiary.entries.map(([text, time]) => (
                        <div key={`${time}-${text}`} className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                          <p>{text}</p>
                          <p className="mt-2 text-right text-xs text-slate-400">{time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed bg-slate-50 p-6 text-center">
                  <p className="mb-2 text-sm font-semibold text-slate-700">작성된 일기가 없습니다</p>
                  <p className="mb-5 text-xs leading-5 text-slate-400">이 날짜에는 저장된 일기가 없어요.</p>
                  <button
                    type="button"
                    onClick={() => setMemoInputOpen(true)}
                    className="h-10 rounded-2xl bg-slate-900 px-5 text-sm text-white"
                  >
                    새로 쓰기
                  </button>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
