import { ReactNode, useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { useAgent, useSessionContext } from '@livekit/components-react';

interface ToastProps {
  title: string;
  description: ReactNode;
}

function toastAlert(toast: ToastProps) {
  sonnerToast.error(toast.title, {
    description: toast.description,
    duration: 10000,
  });
}

export function useAgentErrors() {
  const agent = useAgent();
  const { isConnected, end } = useSessionContext();

  useEffect(() => {
    if (isConnected && agent.state === 'failed') {
      const reasons = agent.failureReasons;

      toastAlert({
        title: 'Session ended',
        description: (
          <div className="flex flex-col gap-2">
            {reasons.length > 1 && (
              <ul className="list-inside list-disc text-sm">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            {reasons.length === 1 && <p className="text-sm">{reasons[0]}</p>}
            <p className="text-xs opacity-70">
              Check your agent logs for more details.
            </p>
          </div>
        ),
      });

      end();
    }
  }, [agent, isConnected, end]);
}
