import React from 'react';
import Avatar from '@material-ui/core/Avatar';

export default function User(props) {
  const userEmail = 'user@redkubes.com'
  const userRole = 'Admin'
  return (
    <React.Fragment>
      <Avatar />
      {/* <Box component="span" m={1}> */}
      { `${userEmail} (${userRole})` }
    {/* </Box> */}
    </React.Fragment>

  )
}
