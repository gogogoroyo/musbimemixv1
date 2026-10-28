import React, { useState, useEffect } from 'react';

// --- モックデータと選択肢の設定 ---
const USERS = ['🦐', '🐻', '♨️', '🐕‍🦺', '👾'];
const PARTS = ['Vo', 'Cho', '右Gt', '中Gt', '左Gt', 'Ba', 'Dr', '全体'];

// パートごとの視認性を高めるスタイルマップ
const PART_STYLES = {
  Vo: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-bold',
  Cho: 'bg-purple-100 text-purple-800 border-purple-300 font-semibold',
  右Gt: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
  中Gt: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold',
  左Gt: 'bg-sky-100 text-sky-800 border-sky-300 font-semibold',
  Ba: 'bg-purple-100 text-purple-800 border-purple-300 font-semibold',
  Dr: 'bg-orange-100 text-orange-800 border-orange-300 font-semibold',
  全体: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
};

const MINUTES = Array.from({ length: 30 }, (_, i) =>
  String(i).padStart(2, '0')
);
const SECONDS = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, '0')
);

// --- GAS設定 ---
const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzlC53in6XubGf8CyhvB5yB9a0z5JBAqmRjUYba296MYkcsZWvTD-GawNVwE4BD8GyuHQ/exec';

const INITIAL_DATA = [
  {
    id: 'tab-1',
    title: 'シート1',
    rows: [
      { id: 'row-1', user: '🦐', min: '00', sec: '00', part: '右Gt', text: '' },
    ],
  },
];

export default function MixRevisionApp() {
  const [tabs, setTabs] = useState(INITIAL_DATA);
  const [activeTabId, setActiveTabId] = useState(INITIAL_DATA[0].id);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // モーダル管理用のステート
  const [deleteModalTabId, setDeleteModalTabId] = useState(null);

  // タブ並び替えドラッグ＆ドロップ用ステート
  const [draggedTabId, setDraggedTabId] = useState(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ||
    tabs[0] || { id: '', title: '', rows: [] };

  // --- 1. GASからの初期データ読み込み (GET) ---
  useEffect(() => {
    fetch(GAS_WEB_APP_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && data.tabs && data.tabs.length > 0) {
          setTabs(data.tabs);
          setActiveTabId(data.tabs[0].id);
        }
      })
      .catch((err) => {
        console.error('データ取得エラー:', err);
        showToast('データの読み込みに失敗しました');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // --- 2. GASへのデータ保存 (POST) ---
  const saveToGas = (updatedTabs) => {
    setIsSaving(true);

    const payload = {
      tabs: updatedTabs,
    };

    fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== 'success') {
          showToast('保存エラー: ' + data.message);
        }
        // 「スプレッドシートに保存しました」というトースト通知は非表示にしています
      })
      .catch((err) => {
        console.error('保存エラー:', err);
        showToast('通信エラー: 保存できませんでした');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const updateTabsWithSave = (newTabs) => {
    setTabs(newTabs);
    saveToGas(newTabs);
  };

  // --- タブ操作 ---

  const handleAddTab = () => {
    const newTab = {
      id: `tab-${Date.now()}`,
      title: `新規楽曲 ${tabs.length + 1}`,
      rows: [],
    };
    const newTabs = [...tabs, newTab];
    updateTabsWithSave(newTabs);
    setActiveTabId(newTab.id);
  };

  // タブ削除の実行
  const confirmDeleteTab = () => {
    if (!deleteModalTabId) return;
    if (tabs.length <= 1) {
      showToast('最後の1枚は削除できません');
      setDeleteModalTabId(null);
      return;
    }

    const newTabs = tabs.filter((t) => t.id !== deleteModalTabId);
    if (activeTabId === deleteModalTabId) {
      setActiveTabId(newTabs[0].id);
    }
    updateTabsWithSave(newTabs);
    setDeleteModalTabId(null);
  };

  // --- タブ並び替え（ドラッグ＆ドロップ） ---
  const handleDragStart = (e, tabId) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetTabId) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetTabId) return;

    const draggedIndex = tabs.findIndex((t) => t.id === draggedTabId);
    const targetIndex = tabs.findIndex((t) => t.id === targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTabs = [...tabs];
    const [removed] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, removed);

    setTabs(newTabs);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    saveToGas(tabs);
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    const newTabs = tabs.map((t) =>
      t.id === activeTabId ? { ...t, title: newTitle } : t
    );
    setTabs(newTabs);
  };

  const handleTitleBlur = () => {
    saveToGas(tabs);
  };

  // --- 行（修正指示）操作 ---

  const handleAddRow = () => {
    const lastRow = activeTab?.rows?.[activeTab.rows.length - 1];
    const newRow = {
      id: `row-${Date.now()}`,
      user: lastRow ? lastRow.user : USERS[0],
      min: '00',
      sec: '00',
      part: lastRow ? lastRow.part : PARTS[2], // デフォルト: '右Gt'
      text: '',
    };

    const newTabs = tabs.map((t) => {
      if (t.id === activeTabId) {
        return { ...t, rows: [...t.rows, newRow] };
      }
      return t;
    });
    updateTabsWithSave(newTabs);
  };

  const handleUpdateRow = (rowId, field, value) => {
    const newTabs = tabs.map((t) => {
      if (t.id === activeTabId) {
        return {
          ...t,
          rows: t.rows.map((r) =>
            r.id === rowId ? { ...r, [field]: value } : r
          ),
        };
      }
      return t;
    });
    setTabs(newTabs);
  };

  const handleRowBlur = () => {
    saveToGas(tabs);
  };

  // 行の即時削除（確認モーダルなし）
  const handleDeleteRow = (rowId) => {
    const newTabs = tabs.map((t) => {
      if (t.id === activeTabId) {
        return { ...t, rows: t.rows.filter((r) => r.id !== rowId) };
      }
      return t;
    });
    updateTabsWithSave(newTabs);
  };

  const handleSortRows = () => {
    const newTabs = tabs.map((t) => {
      if (t.id === activeTabId) {
        const sortedRows = [...t.rows].sort((a, b) => {
          const timeA = `${a.min}:${a.sec}`;
          const timeB = `${b.min}:${b.sec}`;
          return timeA.localeCompare(timeB);
        });
        return { ...t, rows: sortedRows };
      }
      return t;
    });
    updateTabsWithSave(newTabs);
    showToast('時間順に並び替えました');
  };

  // --- レンダリング ---
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 text-gray-500">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="font-bold">スプレッドシートから読み込み中...</p>
      </div>
    );
  }

  const tabToDelete = tabs.find((t) => t.id === deleteModalTabId);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
      {/* 1. タブエリア（上部・ドラッグ並び替え対応） */}
      <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-end overflow-x-auto hide-scrollbar px-2 pt-2">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border border-b-0 cursor-grab active:cursor-grabbing ${
                activeTabId === tab.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              } mr-1`}
            >
              <span>
                {tab.title.substring(0, 10)}
                {tab.title.length > 10 ? '...' : ''}
              </span>

              {/* タブ削除ボタン（×） */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModalTabId(tab.id);
                }}
                className={`ml-1 w-4 h-4 rounded-full flex items-center justify-center text-xs transition-colors ${
                  activeTabId === tab.id
                    ? 'hover:bg-blue-600 text-blue-100'
                    : 'hover:bg-gray-300 text-gray-400'
                }`}
                title="シートを削除"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={handleAddTab}
            className="px-3 py-2 text-sm font-bold text-blue-500 whitespace-nowrap mb-1 hover:bg-blue-50 rounded"
          >
            ＋ 追加
          </button>
        </div>
      </header>

      {/* 2. タイトルエリア */}
      <div className="flex-shrink-0 bg-white p-3 border-b border-gray-200 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={activeTab ? activeTab.title : ''}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="楽曲名・バージョンを入力"
            className="w-full text-lg font-bold bg-transparent outline-none placeholder-gray-400"
          />
          {isSaving && (
            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
              保存中...
            </span>
          )}
        </div>
      </div>

      {/* 3. 修正指示リスト */}
      <main className="flex-1 overflow-y-auto p-2 space-y-2">
        {!activeTab || !activeTab.rows || activeTab.rows.length === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">
            まだ修正指示がありません。
            <br />
            下のボタンから追加してください。
          </div>
        ) : (
          activeTab.rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-row items-center gap-1.5 p-2 bg-white rounded-lg shadow-sm border border-gray-100"
            >
              {/* 入力者 (絵文字ドロップダウン + ▼) */}
              <div className="relative shrink-0 flex items-center bg-gray-50 border border-gray-200 rounded px-1 h-8">
                <select
                  className="bg-transparent text-lg pr-3 appearance-none focus:outline-none cursor-pointer"
                  value={row.user}
                  onChange={(e) =>
                    handleUpdateRow(row.id, 'user', e.target.value)
                  }
                  onBlur={handleRowBlur}
                >
                  {USERS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <span className="absolute right-1 text-[8px] text-gray-400 pointer-events-none">
                  ▼
                </span>
              </div>

              {/* 時間指定 (分:秒) */}
              <div className="flex shrink-0 items-center h-8 bg-gray-50 border border-gray-200 rounded px-1">
                <select
                  className="bg-transparent text-sm appearance-none focus:outline-none text-center font-mono w-6 cursor-pointer"
                  value={row.min}
                  onChange={(e) =>
                    handleUpdateRow(row.id, 'min', e.target.value)
                  }
                  onBlur={handleRowBlur}
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="text-gray-400 font-mono text-xs">:</span>
                <select
                  className="bg-transparent text-sm appearance-none focus:outline-none text-center font-mono w-6 cursor-pointer"
                  value={row.sec}
                  onChange={(e) =>
                    handleUpdateRow(row.id, 'sec', e.target.value)
                  }
                  onBlur={handleRowBlur}
                >
                  {SECONDS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* パート指定 (カラーバッジ + ▼) */}
              <div
                className={`relative shrink-0 flex items-center border rounded px-1.5 h-8 transition-colors ${
                  PART_STYLES[row.part] || PART_STYLES['全体']
                }`}
              >
                <select
                  className="bg-transparent text-xs pr-3 appearance-none focus:outline-none font-bold cursor-pointer text-center"
                  value={row.part}
                  onChange={(e) =>
                    handleUpdateRow(row.id, 'part', e.target.value)
                  }
                  onBlur={handleRowBlur}
                >
                  {PARTS.map((p) => (
                    <option
                      key={p}
                      value={p}
                      className="bg-white text-gray-800 font-normal"
                    >
                      {p}
                    </option>
                  ))}
                </select>
                <span className="absolute right-1 text-[8px] opacity-60 pointer-events-none">
                  ▼
                </span>
              </div>

              {/* 修正内容テキスト */}
              <textarea
                className="flex-grow text-sm bg-transparent border-b border-gray-200 focus:border-blue-500 focus:outline-none resize-none px-1 py-1 min-h-[32px]"
                rows="1"
                placeholder="修正内容..."
                value={row.text}
                onChange={(e) => {
                  handleUpdateRow(row.id, 'text', e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onBlur={handleRowBlur}
              />

              {/* 行削除ボタン（ワンタップ即時削除） */}
              <button
                onClick={() => handleDeleteRow(row.id)}
                className="shrink-0 w-6 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors font-bold text-lg"
                title="行を削除"
              >
                ×
              </button>
            </div>
          ))
        )}
      </main>

      {/* 4. アクションエリア（下部） */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200 p-3 pb-safe space-y-2">
        <button
          onClick={handleAddRow}
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold shadow-sm active:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          クリックして新規修正指示を追加...
        </button>
        <button
          onClick={handleSortRows}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium shadow-sm border border-gray-200 active:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          時間順に並び替え
        </button>
      </footer>

      {/* シート削除確認モーダル */}
      {deleteModalTabId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-gray-800 mb-2">
              シートの削除
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              「
              <span className="font-semibold text-gray-900">
                {tabToDelete?.title}
              </span>
              」を削除してもよろしいですか？
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteModalTabId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDeleteTab}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg transition-opacity z-40">
          {toastMessage}
        </div>
      )}

      {/* スマホ画面用CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0.75rem);
        }
      `,
        }}
      />
    </div>
  );
}
