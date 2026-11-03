import type { TopicMeta } from '../types';

export const meta: TopicMeta = {
  topic: 'spring-boot',
  title: 'Spring Boot',
  group: 'Spring',
  summary: 'Spring MVC 요청 처리, `@Transactional` proxy, bean lifecycle, auto-configuration을 소스 코드 수준에서 따라갑니다.',
  order: 1,
  // Checked on spring.io (Spring Boot 4.1.2) and in spring-boot v4.1.2 gradle.properties
  // (springFrameworkVersion=7.0.10, tomcatVersion=11.0.27).
  versions: {
    'Spring Boot': '4.1.2',
    'Spring Framework': '7.0.10',
    'Apache Tomcat': '11.0.27',
  },
  checkedOn: '2026-11-03',
  lessons: ['request-flow'],
  // One map for every Spring lesson. The request travels left to right along the middle row
  // (outside → inside, caller → callee); lookups sit above it, conversions below it. The
  // service, repository, and database positions are for later lessons (@Transactional).
  layout: {
    width: 2000,
    height: 1000,
    nodes: [
      { id: 'client', label: 'Client', sublabel: 'HTTP/1.1', kind: 'client', icon: 'laptop', x: 140, y: 520 },
      { id: 'tomcat', label: 'Tomcat', sublabel: 'http-nio-8080', kind: 'container', icon: 'server', x: 380, y: 520 },
      { id: 'filters', label: 'Filter chain', sublabel: 'Servlet Filter', kind: 'container', icon: 'filter-stack', x: 620, y: 520 },
      { id: 'dispatcher', label: 'DispatcherServlet', sublabel: 'doDispatch()', kind: 'framework', icon: 'hub', x: 860, y: 520 },
      { id: 'mapping', label: 'HandlerMapping', sublabel: 'getHandler()', kind: 'framework', icon: 'index', x: 860, y: 260 },
      { id: 'adapter', label: 'HandlerAdapter', sublabel: 'handle()', kind: 'framework', icon: 'adapter', x: 1100, y: 520 },
      { id: 'resolver', label: '@RequestBody', sublabel: 'HttpMessageConverter', kind: 'framework', icon: 'converter', x: 1100, y: 790 },
      { id: 'controller', label: 'OrderController', sublabel: '@RestController', kind: 'app', icon: 'controller', x: 1340, y: 520 },
      { id: 'returns', label: '@ResponseBody', sublabel: 'HttpMessageConverter', kind: 'framework', icon: 'converter', x: 1340, y: 790 },
      { id: 'service', label: 'OrderService', sublabel: '@Service', kind: 'app', icon: 'service', x: 1580, y: 520 },
      { id: 'repository', label: 'OrderRepository', sublabel: '@Repository', kind: 'app', icon: 'repository', x: 1820, y: 520 },
      { id: 'database', label: 'Database', sublabel: 'JDBC', kind: 'storage', icon: 'database', x: 1820, y: 790 },
    ],
  },
};
