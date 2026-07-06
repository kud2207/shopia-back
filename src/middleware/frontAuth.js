import moment from 'moment'

const isAuth = request => {
  const token =
    request.cookies.get('token') && request.cookies.get('token').value
      ? JSON.parse(request.cookies.get('token')?.value)
      : null
  if (!token) return false
  if (Math.floor(Date.now() / 1000) > token?.expireIn) return false
  else return true
}

export const isSubscribe = request => {
  const user =
    request.cookies.get('user') && request.cookies.get('user').value
      ? JSON.parse(request.cookies.get('user')?.value)
      : null
  if (user && user.role != 'marchand') return true
  if (!user || (user && !user.plan)) return true
  return true
  // return moment(user?.subscription_date)
  //   .add(user?.plan?.duration || 0, user?.plan?.unit || 'months')
  //   .isAfter(moment())
}

export const getUser = request => {
  const user =
    request.cookies.get('user') && request.cookies.get('user').value
      ? JSON.parse(request.cookies.get('user')?.value)
      : null

  return user
}
export default isAuth
