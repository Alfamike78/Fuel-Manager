import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import SignIn from "./pages/sign-in";
import Dashboard from "./pages/dashboard";
import SuperAdmin from "./pages/superadmin";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={SignIn} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/superadmin" component={SuperAdmin} />
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
