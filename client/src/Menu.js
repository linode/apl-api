import React from 'react';
import { Link } from "react-router-dom";

import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import DashboardIcon from '@material-ui/icons/Dashboard';
import PeopleIcon from '@material-ui/icons/People';
import CloudIcon from '@material-ui/icons/Cloud';
import SwapVerticalCircleIcon from '@material-ui/icons/SwapVerticalCircle';

export const LeftMenu = (
  <div>
    <ListItem component={Link} to="/">
      <ListItemIcon>
        <DashboardIcon />
      </ListItemIcon>
      <ListItemText primary="Overview" />
    </ListItem>
    <ListItem component={Link} to="/clusters">
      <ListItemIcon>
        <CloudIcon />
      </ListItemIcon>
      <ListItemText primary="Clusters" />
    </ListItem>
    <ListItem component={Link} to="/teams">
      <ListItemIcon>
        <PeopleIcon />
      </ListItemIcon>
      <ListItemText primary="Teams" />
    </ListItem>
    <ListItem component={Link} to="/services" >
      <ListItemIcon>
        <SwapVerticalCircleIcon />
      </ListItemIcon>
      <ListItemText primary="Services" />
    </ListItem>
  </div>
);


export const LeftMenuTeam = (teamId) => {
  return (
  <div>
    <ListItem component={Link} to="/">
      <ListItemIcon>
        <DashboardIcon />
      </ListItemIcon>
      <ListItemText primary="Overview" />
    </ListItem>
    <ListItem component={Link} to="{`/team/${teamId}/clusters`}">
      <ListItemIcon>
        <CloudIcon />
      </ListItemIcon>
      <ListItemText primary="Clusters" />
    </ListItem>
    <ListItem component={Link} to="{`/team/${teamId}`}">
      <ListItemIcon>
        <PeopleIcon />
      </ListItemIcon>
      <ListItemText primary="Teams" />
    </ListItem>
    <ListItem component={Link} to="{`/team/${teamId}/services`}">
      <ListItemIcon>
        <SwapVerticalCircleIcon />
      </ListItemIcon>
      <ListItemText primary="Services" />
    </ListItem>
  </div>
  )
}
