import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { EntryList } from '../components/EntryList';
import { useAppContext } from '../context/AppProvider';
import { useLanguage } from '../context/LanguageContext';
import { Entry } from '../types/index';

type EntryFilter = 'all' | 'workout' | 'meal';
type SortOrder = 'newest' | 'oldest';

export const History: React.FC = () => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const navigate = useNavigate();
  const { userId, entries, setEntries, setLoading, setError } = useAppContext();
  const [filter, setFilter] = useState<EntryFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const loadEntries = async () => {
      try {
        setLoading(true);
        const fetchedEntries = await apiClient.getEntries(userId, 120);
        setEntries(fetchedEntries);
      } catch (error) {
        setError(zh ? '加载记录失败' : 'Failed to load entries');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadEntries();
    }
  }, [setEntries, setError, setLoading, userId]);

  const filteredEntries = useMemo(() => {
    const normalizedStart = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const normalizedEnd = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

    return [...entries]
      .filter((entry) => (filter === 'all' ? true : entry.type === filter))
      .filter((entry) => {
        const time = new Date(entry.occurred_at).getTime();
        if (normalizedStart && time < normalizedStart) {
          return false;
        }
        if (normalizedEnd && time > normalizedEnd) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const delta = new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime();
        return sortOrder === 'newest' ? delta : -delta;
      });
  }, [endDate, entries, filter, sortOrder, startDate]);

  const handleDeleteEntry = async (entryId: string) => {
    try {
      setLoading(true);
      await apiClient.deleteEntry(entryId);
      setEntries(entries.filter((entry) => entry.id !== entryId));
    } catch (error) {
      setError(zh ? '删除记录失败' : 'Failed to delete entry');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEntry = (entry: Entry) => {
    console.log('Selected entry', entry.id);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{zh ? '历史记录' : 'History'}</h1>
          <p className="mt-2 text-slate-500">{zh ? '筛选并回顾当前洞察背后的行为模式。' : 'Filter and review the activity patterns that are driving your current insight set.'}</p>
        </div>
        <button
          onClick={() => navigate('/log')}
          className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          {zh ? '再记一条' : 'Log another entry'}
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="text-sm text-slate-600">
            {zh ? '类型' : 'Type'}
            <select value={filter} onChange={(event) => setFilter(event.target.value as EntryFilter)} className="mt-2 block w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900">
              <option value="all">{zh ? '全部' : 'All'}</option>
              <option value="workout">{zh ? '训练' : 'Workouts'}</option>
              <option value="meal">{zh ? '饮食' : 'Meals'}</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            {zh ? '排序' : 'Sort'}
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)} className="mt-2 block w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900">
              <option value="newest">{zh ? '最新在前' : 'Newest first'}</option>
              <option value="oldest">{zh ? '最早在前' : 'Oldest first'}</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            {zh ? '开始日期' : 'Start date'}
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900" />
          </label>
          <label className="text-sm text-slate-600">
            {zh ? '结束日期' : 'End date'}
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-300 px-3 py-2 text-slate-900" />
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm uppercase tracking-wide text-slate-500">{zh ? '可见记录' : 'Visible entries'}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{filteredEntries.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm uppercase tracking-wide text-slate-500">{zh ? '训练' : 'Workouts'}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{filteredEntries.filter((entry) => entry.type === 'workout').length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm uppercase tracking-wide text-slate-500">{zh ? '饮食' : 'Meals'}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{filteredEntries.filter((entry) => entry.type === 'meal').length}</div>
        </div>
      </section>

      <EntryList entries={filteredEntries} onDeleteEntry={handleDeleteEntry} onSelectEntry={handleSelectEntry} />
    </div>
  );
};