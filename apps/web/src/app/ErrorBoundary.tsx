import { Component, type ReactNode } from "react";
import { UnreadableDataError } from "@/storage/errors";
import { resetLocalData } from "@/storage/reset";
import { RenderErrorScreen, UnreadableDataScreen } from "./SystemScreens.tsx";

type State = { error: "none" | "unreadable" | "render" };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: "none" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      error: error instanceof UnreadableDataError ? "unreadable" : "render",
    };
  }

  reset = () => {
    resetLocalData();
    window.history.replaceState(null, "", "/sign-in");
    this.setState({ error: "none" });
  };

  render() {
    if (this.state.error === "unreadable") {
      return <UnreadableDataScreen onReset={this.reset} />;
    }
    if (this.state.error === "render") return <RenderErrorScreen />;
    return this.props.children;
  }
}
