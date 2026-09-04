import { Component } from 'react'

/**
 * If WebGL is unavailable (or the scene throws), the page keeps working — it
 * just loses the bottle. Never let a 3D failure take the store down with it.
 */
export default class SceneBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('3D scene failed to start:', error)
    this.props.onError?.()
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-[46vmin] w-[16vmin] rounded-[6vmin] bg-gradient-to-b from-bone-200 via-bone-300 to-bone-200 shadow-lift" />
        </div>
      )
    }
    return this.props.children
  }
}
