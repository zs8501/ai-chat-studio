import { useEffect, useState } from 'react';
import { fetchServerInfo, type ServerInfo } from './api/chat';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { useChatStore } from './store/chat';

export default function App() {
  const theme = useChatStore((s) => s.theme);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    fetchServerInfo()
      .then(setServerInfo)
      .catch(() => setServerInfo(null));
  }, []);

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} serverInfo={serverInfo} />
      <ChatView models={serverInfo?.models ?? ['deepseek-chat', 'deepseek-reasoner']} onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
}
