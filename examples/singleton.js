const singleton = Symbol();
const singletonEnforcer = Symbol();

const baseAbsPath = __dirname + '/';

const BackendApiCore = require(baseAbsPath + '../lib/BackendApiCore').default;

class BackendApiSingleton extends BackendApiCore {
  constructor(enforcer) {
    if (enforcer != singletonEnforcer) throw 'Cannot construct singleton';

		super(enforcer);
  }

  static get instance() {
    if (!this[singleton]) {
      this[singleton] = new BackendApiSingleton(singletonEnforcer);
    }
    return this[singleton];
  }
}

const instance = BackendApiSingleton.instance; 
instance.loadConfigFileSync(baseAbsPath + './configs/fserver.conf');

const webLoginInfoDict = instance.queryWebLoginInfoDictSync();
console.dir(webLoginInfoDict);
