// TODO: extract hamlview out into a separate js file

class NullViewObject {}

class HamlView {

  constructor(object = new NullViewObject()) {
    this.object = object
    this.initView()
  }

  initView() {
    const paymentTplSelector  = ".payment_template"
    const paymentTplElem      = document.querySelector(paymentTplSelector)
    const paymentTplHaml      = paymentTplElem.innerHTML
    const compiledTemplate    = Haml(paymentTplHaml)
    this.compiledTemplate     = compiledTemplate
  }

  render() {
    return this.renderHaml(this.compiledTemplate, this.object)
  }

  renderHaml(compiledTemplate, object) {
    return (compiledTemplate)(object)
  }

}


class App {

  constructor() {
    this.keychain   = new NullKeychain()
    this.balance    = new NullBalance()
    this.rate       = new NullRate()
    this.events     = new NullEventEmitter()
    this.addEventsEmitter()
    this.view = this.initView()
    this.initKeychain()
  }

  initView() {
    if (this.view) return this.view
    const view = new View()
    console.log("View initialized")
    this.initDevViewHacks()
    return view
  }

  // TODO: temporary, TODO: integrate

  initDevViewHacks() {
    bindDevButtons()
  }

  addEventsEmitter() {
    const bodyElem  = doc.querySelector("html > body")
    const domNode   = doc.createElement("div")
    domNode.classList = ["events"]
    bodyElem.appendChild(domNode) // div.events.hidden (empty div)
    const eventsElem    = doc.querySelector("html > body > div.events") // div.events.hidden (empty div)
    const eventEmitter  =  eventsElem
    this.events = eventEmitter
  }

  initKeychain() {
    const keychain = new Keychain({ store: localStorage })
    this.keychain = keychain

    ;(async () => {
      try {
        // inits the keychain - load the settings for the user node
        const isInitialized = await keychain.initLNKeychain()
        console.log("keychain init:", isInitialized)
        this.emitAddressEvent()
      } catch (err) {
        console.error(err)
      }

      try {
        await this.updateBalance()
      } catch (err) {
        console.error(err)
      }


      // TODO: refactor

      const object = {
        arrow: "down",
        amount: new Number(100),
        invoice: "lnbc123459abcd",
        // invoice: "lnbc123456789abcdef",
      }
      this.object = object

      const html = new HamlView(this.object).render()
      console.log("HTML:", html)

      const paymentListSelector = ".tx-list.list.payments-list"
      const paymentListElem = document.querySelector(paymentListSelector)
      paymentListElem.innerHTML = html

      // TODO: remove
      //
      // keychain.info()
      // const tabChangeEvt = () => {
      //   console.log("tab change")
      // }
      // document.querySelector('#main-tabbar').addEventListener('prechange', tabChangeEvt)

    })().catch((err) => {
      console.error(err)
    })
  }

  emitAddressEvent() {
    const data = {
      address: this.keychain.address,
    }
    this.emit({ event: "info", data: data })
  }

  emit({ event, data }) {
    // console.log("emit", event)
    // const events = this.events
    const events = doc.querySelector("html > body > div.events")
    const customEvent = new CustomEvent(event, { detail: data })
    events.dispatchEvent(customEvent)
  }

  async updateBalance() {
    // TODO: port back to keychain
    // TODO: use a balance-only function
    // const { balance } = await this.keychain.balance()

    // TODO: check balance call
    const bal = await this.keychain.balance()
    // TODO: const { confirmed_balance, unconfirmed_balance } = balance

    // const balanceInt = await this.keychain.balanceInt()
    // console.log("balanceInt:", balanceInt)

    // TODO: include rate into keychain

    // compare rate bitstamp
    this.balance = bal.balance

    // TODO: load cached value, load FX value from network later (10 seconds, or if everything else is loaded)
    await this.loadFX()
  }


  get address() {
    return this.keychain.address
  }

  genNewAddress() {
    return this.keychain.getNewAddress()
  }


  // FX methods - TODO: extract

  async loadFX() {
    const price = await this.getBTCFx()
    this.rate = price

    const balanceSats = this.balance
    const balanceBtc  = balanceSats / 10**8
    const balanceUsd  = balanceBtc * this.rate
    const balanceUsdCents = Math.floor(balanceUsd * 10000) / 100

    const data = {
      balanceSats,
      balanceUsd,
      balanceUsdCents,
      // balanceBtc,
      // balanceBits,
      // balanceMBtcs,  (millibits)
      // balanceMillis,
    }

    this.emit({ event: "balance", data: data })
  }

  async getBTCFx() {
    let resp = await fetch("https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD")
    resp = await resp.json()
    resp = resp.USD
    console.log("BTCUSD rate fetched:", resp)
    return resp
  }


}
