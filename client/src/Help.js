import React from "react";

import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Tooltip from 'react-bootstrap/Tooltip'
import { IoIosHelpCircle } from "react-icons/io";


class Help extends React.Component {

  renderTooltip = (props) => {
    return <Tooltip {...props}>{this.props.description}</Tooltip>;
  }

  renderOverlay() {

    return (
    <OverlayTrigger
      placement="right"
      delay={{ show: 250, hide: 400 }}
      overlay={this.renderTooltip}>
      <IoIosHelpCircle />
    </OverlayTrigger>
    )
  }

  render() {
    let desc = null
    if(this.props.description)
      desc = this.renderOverlay()
  
    return (
      desc
    )
  }

}

export default Help