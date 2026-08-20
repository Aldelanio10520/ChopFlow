import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
      <div className="surface flex items-center justify-between gap-3 p-3 shadow-lg">
        <p className="text-sm">Instale o ChopFlow no celular para usar como aplicativo.</p>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={() => setVisible(false)}>
            Agora não
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await deferred.prompt();
              setVisible(false);
              setDeferred(null);
            }}
          >
            <Download className="mr-1 h-4 w-4" /> Instalar
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
