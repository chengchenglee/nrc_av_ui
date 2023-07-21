import { Route, Routes as ReactRoutes } from 'react-router-dom';
import { ROUTES, SingleRoute } from './routesConfig';

const Routes = () => {
  const _renderRoute = (routes: SingleRoute[]) =>
    routes.map((route, index) => {
      const { path, component, children } = route;
      return (
        <Route key={`${String(path)}${index}`} element={route.guard}>
          <Route path={path} element={component}>
            {children ? _renderRoute(children) : null}
          </Route>
        </Route>
      );
    });
  return <ReactRoutes>{_renderRoute(ROUTES)}</ReactRoutes>;
};

export default Routes;
