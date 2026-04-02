import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageTopbar } from '@/components/PageTopbar';
import { SegmentedControl } from '@/components/SegmentedControl';
import {
  loadCompatibilityHistory,
  loadPersonalHistory,
  removeCompatibilityHistory,
  removePersonalHistory,
} from '@/lib/history-records';
import { buildResultSearch, defaultPromptState } from '@/lib/query-state';

type HistoryTab = 'personal' | 'compatibility';

function formatUpdatedAt(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function RecordsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const defaultTab: HistoryTab =
    searchParams.get('tab') === 'compatibility' ? 'compatibility' : 'personal';
  const [activeTab, setActiveTab] = useState<HistoryTab>(defaultTab);

  const personalRecords = useMemo(() => loadPersonalHistory(), [refreshKey]);
  const compatibilityRecords = useMemo(() => loadCompatibilityHistory(), [refreshKey]);
  const query = searchText.trim().toLowerCase();

  const filteredPersonal = useMemo(() => {
    if (!query) {
      return personalRecords;
    }

    return personalRecords.filter((item) =>
      `${item.name} ${item.birthText}`.toLowerCase().includes(query),
    );
  }, [personalRecords, query]);

  const filteredCompatibility = useMemo(() => {
    if (!query) {
      return compatibilityRecords;
    }

    return compatibilityRecords.filter((item) =>
      `${item.primaryName} ${item.partnerName} ${item.name}`.toLowerCase().includes(query),
    );
  }, [compatibilityRecords, query]);

  function handleOpenPersonal(index: number) {
    const record = filteredPersonal[index];
    navigate(`/result?${buildResultSearch(record.input, defaultPromptState)}`);
  }

  function handleOpenCompatibility(index: number) {
    const record = filteredCompatibility[index];
    navigate(
      `/result?${buildResultSearch(record.input, {
        ...defaultPromptState,
        promptSource: 'bazi',
        baziPresetId: 'ai-compat-marriage',
      })}`,
    );
  }

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  function handleDeletePersonal(id: string) {
    removePersonalHistory(id);
    refresh();
  }

  function handleDeleteCompatibility(id: string) {
    removeCompatibilityHistory(id);
    refresh();
  }

  return (
    <div className="page-shell input-page-shell">
      <div className="bazi-view-container">
        <section className="history-page-section">
          <PageTopbar
            title="历史记录"
            onBack={() =>
              navigate(`/?mode=${activeTab === 'compatibility' ? 'compatibility' : 'single'}`)
            }
          />

          <div className="person-section-head history-section-head">
            <p>支持搜索，点击记录可直接进入结果页。</p>
          </div>

          <div className="records-header-bar">
            <SegmentedControl
              value={activeTab}
              options={[
                { label: '个人记录', value: 'personal' as const },
                { label: '合盘记录', value: 'compatibility' as const },
              ]}
              onChange={(value) => setActiveTab(value)}
            />
          </div>

          <div className="records-controls">
            <input
              value={searchText}
              type="text"
              className="form-input"
              placeholder="搜索姓名..."
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>

          {activeTab === 'personal' ? (
            filteredPersonal.length === 0 ? (
              <div className="records-empty-card">暂无匹配的个人记录</div>
            ) : (
              <>
                <div className="records-list">
                  {filteredPersonal.map((record, index) => (
                    <div
                      key={record.id}
                      className="record-item"
                      onClick={() => handleOpenPersonal(index)}
                    >
                      <div className="record-info">
                        <div className="info-line-1">
                          <span className="name">{record.name}</span>
                          <span className="record-time">{formatUpdatedAt(record.updatedAt)}</span>
                        </div>
                        <div className="details-line">
                          <span className="gender">{record.gender === 'male' ? '男' : '女'}</span>
                          <span className="birthday">{record.birthText}</span>
                          <span className="record-tag">个人</span>
                        </div>
                      </div>
                      <div className="history-actions">
                        <button
                          type="button"
                          className="history-action-btn history-action-danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeletePersonal(record.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="records-summary">共 {filteredPersonal.length} 条记录</div>
              </>
            )
          ) : filteredCompatibility.length === 0 ? (
            <div className="records-empty-card">暂无匹配的合盘记录</div>
          ) : (
            <>
              <div className="records-list">
                {filteredCompatibility.map((record, index) => (
                  <div
                    key={record.id}
                    className="record-item compatibility-item"
                    onClick={() => handleOpenCompatibility(index)}
                  >
                    <div className="record-info">
                      <div className="info-line-1">
                        <span className="name">{record.name}</span>
                        <span className="record-time">{formatUpdatedAt(record.updatedAt)}</span>
                      </div>
                      <div className="details-line">
                        <span className="birthday">
                          {record.input.year}-{record.input.month}-{record.input.day}
                        </span>
                        <span className="birthday">
                          {record.input.partnerYear}-{record.input.partnerMonth}-{record.input.partnerDay}
                        </span>
                        <span className="record-tag">合盘</span>
                      </div>
                    </div>
                    <div className="history-actions">
                      <button
                        type="button"
                        className="history-action-btn history-action-danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteCompatibility(record.id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="records-summary">共 {filteredCompatibility.length} 条记录</div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
