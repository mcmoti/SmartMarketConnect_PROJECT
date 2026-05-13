interface Conversation {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
}

const ConversationList = ({ conversations, activeId, onSelect }: ConversationListProps) => (
  <div className="flex flex-col">
    {conversations.length === 0 && (
      <p className="text-center text-muted-foreground text-sm py-12">No conversations yet.</p>
    )}
    {conversations.map((conv) => (
      <button
        key={conv.id}
        onClick={() => onSelect(conv.id)}
        className={`flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border ${
          activeId === conv.id ? "bg-primary/5" : "hover:bg-muted/50"
        }`}
      >
        <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
          {conv.contactName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground text-sm truncate">{conv.contactName}</p>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{conv.timestamp}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
        </div>
        {conv.unread > 0 && (
          <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
            {conv.unread}
          </span>
        )}
      </button>
    ))}
  </div>
);

export default ConversationList;
