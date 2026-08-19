// export default function ChatBubble({ role, text, sources, userInitial = "U" }) {
//   const isUser = role === "user";
//   return (
//     <div className={`chat-row ${isUser ? "user" : "assistant"}`}>
//       <div className="chat-avatar">{isUser ? userInitial : "AI"}</div>
//       <div className="chat-bubble">
//         <div>{text}</div>
//         {!isUser && sources?.length > 0 && (
//           <div className="chat-sources">
//             {sources.map((s, i) => (
//               <span className="chat-source-chip" key={i}>
//                 {s}
//               </span>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export function TypingBubble() {
//   return (
//     <div className="chat-row assistant">
//       <div className="chat-avatar">AI</div>
//       <div className="chat-bubble">
//         <div className="typing-dots">
//           <span />
//           <span />
//           <span />
//         </div>
//       </div>
//     </div>
//   );
// }





import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatBubble({
  role,
  text,
  sources,
  userInitial = "U",
}) {
  const isUser = role === "user";

  return (
    <div className={`chat-row ${isUser ? "user" : "assistant"}`}>
      <div className="chat-avatar">
        {isUser ? userInitial : "AI"}
      </div>

      <div className="chat-bubble">
        {isUser ? (
          // User messages remain plain text
          <div>{text}</div>
        ) : (
          // AI messages are rendered as Markdown
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {text}
            </ReactMarkdown>
          </div>
        )}

        {!isUser && sources?.length > 0 && (
          <div className="chat-sources">
            {sources.map((s, i) => (
              <span className="chat-source-chip" key={i}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="chat-row assistant">
      <div className="chat-avatar">AI</div>

      <div className="chat-bubble">
        <div className="typing-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}