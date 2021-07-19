import React from 'react'
import { Route, Redirect } from 'react-router-dom'

export const PrivateRoute = ({ comp: Component, ...rest }) => {
  const user = null

  const conditionRender = () => {
    if (!user) return <Redirect to='/auth' />

    return <Component />
  }

  return <Route {...rest} exact render={conditionRender} />
}
