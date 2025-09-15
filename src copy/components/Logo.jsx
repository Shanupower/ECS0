import React from 'react'
import logo from '../ecs-logo.png'

export default function Logo({ size = 42, alt = 'ECS Financial' }) {
  const wrap = {
    width: size,
    height: size,
    borderRadius: 8,
    overflow: 'hidden',
    display: 'block'
  }
  const img = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block'
  }
  return (
    <span style={wrap}>
      <img src={logo} alt={alt} style={img} />
    </span>
  )
}
