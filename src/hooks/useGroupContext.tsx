import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface GroupContextType {
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string | null) => void;
  selectedGroupName: string | null;
  setSelectedGroupName: (name: string | null) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load from localStorage on mount and auto-select first group
  useEffect(() => {
    if (user && !hasInitialized) {
      const saved = localStorage.getItem(`selectedGroup_${user.id}`);
      if (saved) {
        try {
          const { groupId, groupName } = JSON.parse(saved);
          setSelectedGroupId(groupId);
          setSelectedGroupName(groupName);
        } catch (error) {
          console.error('Error parsing saved group:', error);
        }
      } else {
        // No saved group, auto-select first available group
        autoSelectFirstGroup();
      }
      setHasInitialized(true);
    }
  }, [user, hasInitialized]);

  const autoSelectFirstGroup = async () => {
    if (!user) return;

    try {
      const { data: groupsData, error } = await supabase
        .from('group_members')
        .select(`
          groups (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;

      if (groupsData && groupsData.length > 0) {
        const firstGroup = groupsData[0].groups as any;
        setSelectedGroupId(firstGroup.id);
        setSelectedGroupName(firstGroup.name);
      }
    } catch (error) {
      console.error('Error auto-selecting first group:', error);
    }
  };

  // Save to localStorage when selection changes
  useEffect(() => {
    if (user) {
      if (selectedGroupId !== null || selectedGroupName !== null) {
        localStorage.setItem(
          `selectedGroup_${user.id}`,
          JSON.stringify({ groupId: selectedGroupId, groupName: selectedGroupName })
        );
      } else {
        localStorage.removeItem(`selectedGroup_${user.id}`);
      }
    }
  }, [user, selectedGroupId, selectedGroupName]);

  const handleSetSelectedGroupId = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    if (groupId === null) {
      setSelectedGroupName(null);
    }
  };

  return (
    <GroupContext.Provider value={{
      selectedGroupId,
      setSelectedGroupId: handleSetSelectedGroupId,
      selectedGroupName,
      setSelectedGroupName
    }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroupContext = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroupContext must be used within a GroupProvider');
  }
  return context;
};