import { Route, Switch } from "wouter";
import Index from "./pages/index";
import ConnectPage from "./pages/connect";
import DealsPage from "./pages/deals";
import ManualPage from "./pages/manual";
import SettingsPage from "./pages/settings";
import LoginPage from "./pages/login";
import { Provider } from "./components/provider";
import { AuthGate } from "./components/auth-gate";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <AuthGate>
        <Switch>
          <Route path="/" component={Index} />
          <Route path="/login" component={LoginPage} />
          <Route path="/connect" component={ConnectPage} />
          <Route path="/deals" component={DealsPage} />
          <Route path="/manual" component={ManualPage} />
          <Route path="/settings" component={SettingsPage} />
        </Switch>
      </AuthGate>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
