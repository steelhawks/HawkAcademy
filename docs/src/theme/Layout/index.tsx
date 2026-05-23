import React from 'react';
import OriginalLayout from '@theme-original/Layout';
import type LayoutType from '@theme/Layout';
import type {WrapperProps} from '@docusaurus/types';

import GlobalSubNav from '@site/src/components/GlobalSubNav';

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): JSX.Element {
  return (
    <OriginalLayout {...props}>
      <GlobalSubNav />
      {props.children}
    </OriginalLayout>
  );
}
