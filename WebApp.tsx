import React, {useEffect} from 'react';
import {
  webViewRender,
  emit,
  useNativeMessage,
} from 'react-native-react-bridge/lib/web';
import {runProver} from './circuits/index';

function Root() {
  // useNativeMessage hook receives message from React Native
  useNativeMessage((message: any) => {
    if (message.type === 'success') {
    }
  });

  useEffect(() => {
    runProver(128, 2).then(res => {
      console.log(res);
      emit({type: 'proof', data: res});
    });
  }, []);

  return <div></div>;
}

// This statement is detected by babelTransformer as an entry point
// All dependencies are resolved, compressed and stringified into one file
export default webViewRender(<Root />);
