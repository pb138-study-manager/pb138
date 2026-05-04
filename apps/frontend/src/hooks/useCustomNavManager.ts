import { useState, useEffect } from 'react';
import { NavItem } from '@/types';
import { useProfileManager } from '@/hooks/useProfileManager';

export const AVAILABLE_ITEMS = [
  { id: 'tasks', label: 'nav.tasks', href: '/tasks' },
  { id: 'today', label: 'nav.today', href: '/today' },
  { id: 'notes', label: 'nav.notes', href: '/notes' },
  { id: 'profile', label: 'nav.profile', href: '/profile' },
  { id: 'others', label: 'nav.others', href: '/others' },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'teachers', label: 'profile.teachers', href: '/teachers' },
];

export function useCustomNavManager() {
  const { userData, isPending: loading, updateCustomNav } = useProfileManager();

  const [selectedIds, setSelectedIds] = useState<string[]>(['tasks', 'today', 'notes', 'others']);
  const [isInitialized, setIsInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && userData && !isInitialized) {
      if (userData.settings.customNav && Array.isArray(userData.settings.customNav)) {
        const ids = userData.settings.customNav.map((n) => n.id);
        // Ensure 'others' is always included
        if (!ids.includes('others')) {
          ids.push('others');
        }
        setSelectedIds(ids);
      }
      setIsInitialized(true);
    }
  }, [userData, loading, isInitialized]);

  const toggleItem = (id: string) => {
    if (id === 'others') return; // Cannot unselect 'others'

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      if (selectedIds.length >= 5) return;
      setSelectedIds([...selectedIds, id]);
    }
  };

  const moveUp = (index: number) => {
    if (index <= 0 || index >= selectedIds.length) return;
    const newArr = [...selectedIds];
    [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
    setSelectedIds(newArr);
  };

  const moveDown = (index: number) => {
    if (index < 0 || index >= selectedIds.length - 1) return;
    const newArr = [...selectedIds];
    [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
    setSelectedIds(newArr);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const navItemsToSave = selectedIds
        .map((id) => AVAILABLE_ITEMS.find((item) => item.id === id))
        .filter(Boolean) as NavItem[];

      await updateCustomNav(navItemsToSave);
      return true;
    } catch (e) {
      console.error('Failed to save nav settings:', e);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Prepare ordered list for display
  const displayItems = [
    ...selectedIds.map((id) => AVAILABLE_ITEMS.find((item) => item.id === id)!),
    ...AVAILABLE_ITEMS.filter((item) => !selectedIds.includes(item.id)),
  ];

  return {
    selectedIds,
    displayItems,
    loading,
    saving,
    toggleItem,
    moveUp,
    moveDown,
    saveSettings,
  };
}