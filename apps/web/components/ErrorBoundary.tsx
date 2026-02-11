"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                    <div className="max-w-md w-full border-2 border-foreground p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] bg-background space-y-6">
                        <div className="flex items-center gap-4 text-red-500">
                            <AlertTriangle className="w-8 h-8" />
                            <h2 className="text-xl font-mono uppercase tracking-tighter font-bold">System Error</h2>
                        </div>

                        <p className="text-xs font-mono uppercase tracking-widest text-foreground/60 leading-relaxed">
                            Something went wrong. The application encountered an unexpected state and needs to be reset.
                        </p>

                        <div className="p-4 bg-foreground/5 border border-foreground/10">
                            <p className="text-[10px] font-mono text-foreground/40 break-all">
                                {this.state.error?.message || "Unknown error occurred"}
                            </p>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 border-2 border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground transition-all flex items-center justify-center gap-2 font-mono uppercase text-xs tracking-widest font-bold"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reboot System
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
