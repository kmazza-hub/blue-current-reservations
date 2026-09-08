(function(){"use strict";
class BlueCurrentAipRuntimeLifecycleEngine{
 constructor(runtime){this.runtime=runtime||new window.BlueCurrentAipPersistentAgentRuntimeEngine();}
 load(runId){return this.runtime.lifecycle(runId);}
 act(runId,action){return this.runtime.control(runId,action);}
}
window.BlueCurrentAipRuntimeLifecycleEngine=BlueCurrentAipRuntimeLifecycleEngine;
})();
