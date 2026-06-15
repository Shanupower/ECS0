/** Prevent mouse wheel from changing focused number input values while scrolling the page. */
export function blockWheelOnNumberInput(e) {
  e.currentTarget.blur()
}
